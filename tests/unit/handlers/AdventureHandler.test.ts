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

    it("should handle null description", async () => {
        const handler = new AdventureHandler(env);
        const api = new MockAIDungeonAPI();
        const adventure = mockAdventure({ description: null });
        // @ts-ignore: stubbing method
        api.getAdventureEmbed = () => Promise.resolve(adventure);

        const context = createMockContext({
            params: { id: "1" },
            state: { api: api as unknown as any }
        });

        await handler.handle(context);
        const body = JSON.parse(context.response.body as string);
        assertEquals(body.description, "");
    });

    it("should handle visibility flags", async () => {
        const handler = new AdventureHandler(env);
        const api = new MockAIDungeonAPI();
        
        // Published
        let adventure = mockAdventure({ published: true });
        // @ts-ignore: stubbing method
        api.getAdventureEmbed = () => Promise.resolve(adventure);
        let context = createMockContext({ params: { id: "1" }, state: { api: api as unknown as any } });
        await handler.handle(context);
        assertEquals(JSON.parse(context.response.body as string).visibility, "published");

        // Unlisted
        adventure = mockAdventure({ published: false, unlisted: true });
        // @ts-ignore: stubbing method
        api.getAdventureEmbed = () => Promise.resolve(adventure);
        context = createMockContext({ params: { id: "2" }, state: { api: api as unknown as any } });
        await handler.handle(context);
        assertEquals(JSON.parse(context.response.body as string).visibility, "unlisted");

        // Neither
        adventure = mockAdventure({ published: false, unlisted: false });
        // @ts-ignore: stubbing method
        api.getAdventureEmbed = () => Promise.resolve(adventure);
        context = createMockContext({ params: { id: "3" }, state: { api: api as unknown as any } });
        await handler.handle(context);
        assertEquals(JSON.parse(context.response.body as string).visibility, undefined);
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
