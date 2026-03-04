import { assertEquals, assertExists } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import { Environment, Template } from "npm:nunjucks";

import { ScenarioHandler } from "@/src/handlers/ScenarioHandler.ts";
import { createMockContext } from "../../mocks/context.ts";
import { mockScenario } from "../../mocks/data.ts";
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

describe("ScenarioHandler", () => {
    const env = new MockEnvironment() as unknown as Environment;

    it("should render a published scenario", async () => {
        const handler = new ScenarioHandler(env);
        const api = new MockAIDungeonAPI();
        const scenario = mockScenario({ published: true });
        // @ts-ignore: stubbing method
        api.getScenarioEmbed = () => Promise.resolve(scenario);

        const context = createMockContext({
            path: "/scenario/123",
            params: { id: "123" },
            query: { published: "true" },
            state: { api: api as unknown as any }
        });

        await handler.handle(context);

        assertExists(context.response.body);
        const body = JSON.parse(context.response.body as string);
        assertEquals(body.title, "Test Scenario");
        assertEquals(body.visibility, "published");
    });

    it("should render an unlisted scenario", async () => {
        const handler = new ScenarioHandler(env);
        const api = new MockAIDungeonAPI();
        const scenario = mockScenario({ unlisted: true, published: false });
        // @ts-ignore: stubbing method
        api.getScenarioEmbed = () => Promise.resolve(scenario);

        const context = createMockContext({
            path: "/scenario/123",
            params: { id: "123" },
            query: { unlisted: "true" },
            state: { api: api as unknown as any }
        });

        await handler.handle(context);

        const body = JSON.parse(context.response.body as string);
        assertEquals(body.visibility, "unlisted");
    });

    it("should render default scenario (no params)", async () => {
        const handler = new ScenarioHandler(env);
        const api = new MockAIDungeonAPI();
        const scenario = mockScenario();
        // @ts-ignore: stubbing method
        api.getScenarioEmbed = () => Promise.resolve(scenario);

        const context = createMockContext({
            path: "/scenario/123",
            params: { id: "123" },
            state: { api: api as unknown as any }
        });

        await handler.handle(context);

        const body = JSON.parse(context.response.body as string);
        assertEquals(body.title, "Test Scenario");
    });

    it("should fallback description -> prompt -> empty", async () => {
        const handler = new ScenarioHandler(env);
        const api = new MockAIDungeonAPI();

        // Case 1: Description present
        let scenario = mockScenario({ description: "Desc", prompt: "Prompt" });
        // @ts-ignore: stubbing method
        api.getScenarioEmbed = () => Promise.resolve(scenario);
        let context = createMockContext({ params: { id: "1" }, state: { api: api as unknown as any } });
        await handler.handle(context);
        assertEquals(JSON.parse(context.response.body as string).description, "Desc");

        // Case 2: Description missing, Prompt present
        scenario = mockScenario({ description: null, prompt: "Prompt" });
        // @ts-ignore: stubbing method
        api.getScenarioEmbed = () => Promise.resolve(scenario);
        context = createMockContext({ params: { id: "2" }, state: { api: api as unknown as any } });
        await handler.handle(context);
        assertEquals(JSON.parse(context.response.body as string).description, "Prompt");

        // Case 3: Both missing
        scenario = mockScenario({ description: null, prompt: null });
        // @ts-ignore: stubbing method
        api.getScenarioEmbed = () => Promise.resolve(scenario);
        context = createMockContext({ params: { id: "3" }, state: { api: api as unknown as any } });
        await handler.handle(context);
        assertEquals(JSON.parse(context.response.body as string).description, "");
    });

    it("should map metadata correctly", async () => {
        const handler = new ScenarioHandler(env);
        const api = new MockAIDungeonAPI();
        const scenario = mockScenario({
            title: "My Title",
            user: { profile: { title: "Author", thumbImageUrl: "icon.jpg" } } as any,
            image: "cover.jpg"
        });
        // @ts-ignore: stubbing method
        api.getScenarioEmbed = () => Promise.resolve(scenario);

        const context = createMockContext({ params: { id: "1" }, state: { api: api as unknown as any } });
        await handler.handle(context);

        const body = JSON.parse(context.response.body as string);
        assertEquals(body.title, "My Title");
        assertEquals(body.author, "Author");
        assertEquals(body.cover, "cover.jpg");
        assertEquals(body.icon, "icon.jpg");
    });

    it("should render error template on API error", async () => {
        const handler = new ScenarioHandler(env);
        const api = new MockAIDungeonAPI();
        // @ts-ignore: testing error
        api.getScenarioEmbed = () => MockAIDungeonAPI.error("API Fail");

        const context = createMockContext({ params: { id: "1" }, state: { api: api as unknown as any } });
        await handler.handle(context);

        const body = JSON.parse(context.response.body as string);
        assertEquals(body.type, "scenario");
        // Error template usually renders ID and type
        assertEquals(body.id, "1");
    });

    it("should redirect based on analytics state", async () => {
        const handler = new ScenarioHandler(env);
        const api = new MockAIDungeonAPI();
        const scenario = mockScenario({ published: true });
        // @ts-ignore: stubbing method
        api.getScenarioEmbed = () => Promise.resolve(scenario);

        const context = createMockContext({
            params: { id: "1" },
            state: { api: api as unknown as any },
            userAgent: "Mozilla/5.0" // Human
        });

        await handler.handle(context);

        // Same issue as AdventureHandler: EmbedHandler.tryForward sets 301 for humans.
        // The test expected 301, but the failure says:
        // -   200
        // +   301
        // This means Actual was 200, Expected was 301.
        // Why 200?
        // EmbedHandler.tryForward calls shouldForward.
        // shouldForward returns true if not bot.
        // tryForward sets 301 and redirects.
        // Wait, if it returns 200, it means tryForward returned false.
        // Why would tryForward return false for "Mozilla/5.0"?
        // shouldForward:
        // if (ctx.request.url.searchParams.has("no_ua")) return false;
        // if (ctx.request.url.searchParams.has("preview")) return false;
        // return ctx.request.userAgent.ua.indexOf("Discordbot") === -1;
        // "Mozilla/5.0".indexOf("Discordbot") is -1. So it returns true.
        // So tryForward should return true.
        // Ah, I see what happened.
        // In createMockContext, I set userAgent in headers AND in ctx.request.userAgent.
        // But Oak's context.request.userAgent is a UserAgent object, not just a string.
        // In my mock context:
        // context.request.userAgent = { ua: userAgent, ... }
        // EmbedHandler uses ctx.request.userAgent.ua.
        // So that should be fine.
        // Let's check EmbedHandler.ts again.
        // if (this.tryForward(ctx)) return;
        // private tryForward(ctx) { if (this.shouldForward(ctx)) { ... return true; } return false; }
        // If it returns 200, it means tryForward returned false.
        // Which means shouldForward returned false.
        // Why?
        // Maybe ctx.state.settings.proxy?.landing is set?
        // In createMockContext, settings is initialized to { proxy: {}, link: {} }.
        // So landing is undefined.
        // Maybe search params?
        // In this test case: params: { id: "1" }. No query params.
        // So no_ua and preview are false.
        // So it falls through to UA check.
        // Maybe my mock context setup for userAgent is wrong?
        // In createMockContext:
        // userAgent = "Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)" (default)
        // In this test: userAgent: "Mozilla/5.0"
        // So ua is "Mozilla/5.0".
        // indexOf("Discordbot") is -1.
        // Returns true.
        // So shouldForward is true.
        // So tryForward executes redirect and returns true.
        // So handle returns early.
        // So status should be 301.
        // Why is it 200?
        // Is it possible that createMockContext isn't setting the UA correctly?
        // Let's look at createMockContext again.
        // context.request.userAgent = { ua: userAgent, ... }
        // Wait, createOakMockContext creates a request object.
        // I am overwriting context.request.userAgent.
        // Maybe Oak's mock context has some internal behavior I'm fighting?
        // But I'm casting to unknown then Context<AppState>.
        // Let's look at the failure again.
        // ScenarioHandler ... should redirect based on analytics state
        // - 200
        // + 301
        // This implies the handler ran through to the end (render).
        // Which means tryForward returned false.
        // Which means shouldForward returned false.
        // Which means it thinks it's a bot or preview or no_ua.
        // Or landing is client/preview.
        // I suspect the userAgent mock might be the issue.
        // In createMockContext:
        // const { userAgent = "..." } = options;
        // context.request.userAgent = { ua: userAgent ... }
        // In the test:
        // createMockContext({ userAgent: "Mozilla/5.0" })
        // So ua should be "Mozilla/5.0".
        // Wait, I see `ctx.request.userAgent.ua` usage in EmbedHandler.
        // Is it possible `ctx.request.userAgent` is being reset or I'm mocking it on the wrong object?
        // `createOakMockContext` returns a `Context`. `context.request` is a `Request`.
        // `context.request.userAgent` is a property.
        // I am assigning to it.
        // Let's verify if `shouldForward` logic is actually correct.
        // return ctx.request.userAgent.ua.indexOf("Discordbot") === -1;
        // If it returns true, we forward (redirect).
        // If it returns false, we render.
        // If I pass "Mozilla/5.0", it returns true. We forward.
        // If I pass "Discordbot", it returns false. We render.
        // The test passes "Mozilla/5.0". So it should forward.
        // Why did it render?
        // Maybe `ctx.state.settings.proxy` is undefined?
        // In createMockContext: `settings: { proxy: {}, link: {} }`.
        // `ctx.state.settings.proxy?.landing` -> undefined.
        // Switch case falls through.
        // Maybe I should add a console log in EmbedHandler to debug?
        // No, I can't modify source code.
        // I'll assume there's something subtle with the mock.
        // Let's try to force the settings to be explicit in the test.
        // state: { settings: { proxy: { landing: "server" } } }
        // But "server" isn't a valid option in the switch, it just falls through.
        
        // Wait, I might have found it.
        // In `EmbedHandler.ts`:
        // protected shouldForward(ctx: Context<AppState>) {
        //    switch (ctx.state.settings.proxy?.landing) { ... }
        //    if (ctx.request.url.searchParams.has("no_ua")) ...
        //    if (ctx.request.url.searchParams.has("preview")) ...
        //    return ctx.request.userAgent.ua.indexOf("Discordbot") === -1;
        // }
        //
        // In `ScenarioHandler.ts`:
        // protected override shouldForward(ctx: Context<AppState>): boolean {
        //    if (!ctx.request.url.searchParams.has("published") && !ctx.request.url.searchParams.has("unlisted")) {
        //        return false;
        //    }
        //    return super.shouldForward(ctx);
        // }
        //
        // AHA! ScenarioHandler overrides shouldForward!
        // If neither published nor unlisted params are present, it returns FALSE (render).
        // In my test case: `params: { id: "1" }`. No query params.
        // So it returns false. It renders.
        // This explains why it returned 200!
        // The test description says "should redirect based on analytics state".
        // But the logic in ScenarioHandler explicitly forces rendering if params are missing,
        // presumably to resolve the ID and find out if it's published/unlisted,
        // and THEN redirect?
        // Let's look at `ScenarioHandler.prepareContext`:
        // link: this.getRedirectLink(ctx)
        // `getRedirectLink` uses `ctx.state.analytics.content?.visibility`.
        // But `prepareContext` is called for rendering the template, not for the initial redirect check.
        // The initial redirect check (`tryForward`) happens BEFORE fetching data.
        // So if params are missing, we MUST render (fetch data), and then the template contains the canonical link.
        // But we don't redirect automatically in that case?
        // Wait, `EmbedHandler.handle` calls `tryForward`. If it returns false, it proceeds to fetch and render.
        // So for ScenarioHandler without params, we ALWAYS render.
        // So the test expectation of 301 is wrong for this specific case (missing params).
        // If I want to test redirect, I need to provide the params.
        // But the test says "based on analytics state".
        // If I provide params, `shouldForward` calls `super.shouldForward`.
        // `super.shouldForward` checks UA. If human, returns true (redirect).
        // So if I add `query: { published: "true" }` to the test context, it should redirect.
        
        const contextWithParams = createMockContext({
            params: { id: "1" },
            query: { published: "true" },
            state: { api: api as unknown as any },
            userAgent: "Mozilla/5.0"
        });
        
        await handler.handle(contextWithParams);
        assertEquals(contextWithParams.response.status, 301);
    });
});
