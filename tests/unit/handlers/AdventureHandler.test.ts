import { assertEquals } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import { Environment, Template } from "npm:nunjucks";

import { AdventureHandler } from "@/src/handlers/AdventureHandler.ts";
import { createMockContext } from "../../mocks/context.ts";
import { mockAdventure } from "../../mocks/data.ts";
import { MockAIDungeonAPI } from "../../mocks/api.ts";

class MockTemplate {
    render(context: object): string {
        return JSON.stringify(context);
    }
}

class MockEnvironment {
    getTemplate(_name: string): Template {
        return new MockTemplate() as unknown as Template;
    }
}

describe("AdventureHandler", () => {
    const env = new MockEnvironment() as unknown as Environment;

    it("should render an adventure", async () => {
        const handler = new AdventureHandler(env);
        const api = new MockAIDungeonAPI();
        const adventure = mockAdventure();
        // @ts-ignore: stubbing method
        api.getAdventureEmbed = () => Promise.resolve(adventure);

        const context = createMockContext({
            params: { id: "1" },
            state: { api: api as unknown as any }
        });

        await handler.handle(context);
        const body = JSON.parse(context.response.body as string);
        assertEquals(body.title, "Test Adventure");
    });

    it("should render adventure in read mode", async () => {
        const handler = new AdventureHandler(env);
        const api = new MockAIDungeonAPI();
        const adventure = mockAdventure();
        // @ts-ignore: stubbing method
        api.getAdventureEmbed = () => Promise.resolve(adventure);

        const context = createMockContext({
            path: "/adventure/1/tail/read",
            params: { id: "1", read: "read" },
            state: { api: api as unknown as any }
        });

        await handler.handle(context);
        assertEquals(context.response.status, 200);
    });

    it("should truncate long descriptions", async () => {
        const handler = new AdventureHandler(env);
        const api = new MockAIDungeonAPI();
        const longDesc = "a".repeat(2000);
        const adventure = mockAdventure({ description: longDesc });
        // @ts-ignore: stubbing method
        api.getAdventureEmbed = () => Promise.resolve(adventure);

        const context = createMockContext({
            params: { id: "1" },
            state: { api: api as unknown as any }
        });

        await handler.handle(context);
        const body = JSON.parse(context.response.body as string);
        assertEquals(body.description.length < 2000, true);
        assertEquals(body.description.endsWith("..."), true);
    });

    it("should redirect non-read path for humans", async () => {
        const handler = new AdventureHandler(env);
        const api = new MockAIDungeonAPI();
        const adventure = mockAdventure();
        // @ts-ignore: stubbing method
        api.getAdventureEmbed = () => Promise.resolve(adventure);

        const context = createMockContext({
            path: "/adventure/1/tail/foo",
            params: { id: "1", read: "foo" },
            state: { api: api as unknown as any },
            userAgent: "Mozilla/5.0"
        });

        await handler.handle(context);
        // The handler uses ctx.response.redirect() which sets status to 302 by default in Oak if not specified,
        // but the handler logic might be setting it explicitly or relying on default.
        // Let's check the implementation.
        // src/middleware/embed.ts:
        // if (ctx.params.read && ctx.params.read !== "read") { ... ctx.response.redirect(link); return; }
        // Oak's redirect() sets status to 302 found by default.
        // However, the test failure says expected 302, actual 301.
        // Wait, the failure was:
        // -   301
        // +   302
        // So it expected 302 but got 301? No, diff is usually - Actual + Expected.
        // So Actual was 301, Expected was 302.
        // Wait, let's re-read the error message carefully.
        // error: AssertionError: Values are not equal.
        // [Diff] Actual / Expected
        // -   301
        // +   302
        // This means Actual was 301.
        // Why 301?
        // Ah, EmbedHandler.tryForward sets 301.
        // But AdventureHandler has specific logic in the router for /read param mismatch.
        // Let's look at src/middleware/embed.ts again.
        // router.get("/adventure/:id/:tail/:read?", async (ctx) => {
        //     if (ctx.params.read && ctx.params.read !== "read") {
        //         ...
        //         ctx.response.redirect(link);
        //         return;
        //     }
        //     await adventure.handle(ctx);
        // });
        // The test calls handler.handle(context) directly, bypassing the router logic in embed.ts!
        // AdventureHandler extends EmbedHandler.
        // EmbedHandler.handle calls tryForward.
        // tryForward calls shouldForward.
        // shouldForward checks for Discordbot. If not bot, returns true (forward).
        // tryForward sets 301 and redirects.
        // So calling handler.handle directly for a human UA *should* result in 301.
        // The test expects 302 because I thought I was testing the router logic, but I'm testing the handler logic.
        // The router logic in embed.ts handles the "read" param mismatch.
        // But here we are testing AdventureHandler.handle.
        // If I pass read="foo", AdventureHandler.handle doesn't know about "read" param specifically,
        // it just sees a request from a human and redirects to the canonical URL (301).
        
        assertEquals(context.response.status, 301);
    });

    it("should render error template on API error", async () => {
        const handler = new AdventureHandler(env);
        const api = new MockAIDungeonAPI();
        // @ts-ignore: testing error
        api.getAdventureEmbed = () => MockAIDungeonAPI.error();

        const context = createMockContext({
            params: { id: "1" },
            state: { api: api as unknown as any }
        });

        await handler.handle(context);
        const body = JSON.parse(context.response.body as string);
        assertEquals(body.type, "adventure");
    });
});
