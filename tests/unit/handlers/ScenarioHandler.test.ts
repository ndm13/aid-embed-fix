import { assertEquals, assertExists } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import { Context } from "@oak/oak";
import { Environment, Template } from "npm:nunjucks";

import { ScenarioHandler } from "@/src/handlers/ScenarioHandler.ts";
import { AppState } from "@/src/types/AppState.ts";
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
            query: { published: "true" }, // Add query param to trigger super.shouldForward
            state: { api: api as unknown as any },
            userAgent: "Mozilla/5.0" // Human
        });

        await handler.handle(context);

        assertEquals(context.response.status, 301);
        // Should redirect to published URL because analytics visibility was set
        const location = context.response.headers.get("Location");
        assertEquals(location?.includes("published=true"), true);
    });

    it("should handle visibility flags", async () => {
        const handler = new ScenarioHandler(env);
        const api = new MockAIDungeonAPI();
        
        // Published
        let scenario = mockScenario({ published: true, unlisted: false });
        // @ts-ignore: stubbing method
        api.getScenarioEmbed = () => Promise.resolve(scenario);
        let context = createMockContext({ params: { id: "1" }, state: { api: api as unknown as any } });
        await handler.handle(context);
        assertEquals(JSON.parse(context.response.body as string).visibility, "published");

        // Unlisted
        scenario = mockScenario({ published: false, unlisted: true });
        // @ts-ignore: stubbing method
        api.getScenarioEmbed = () => Promise.resolve(scenario);
        context = createMockContext({ params: { id: "2" }, state: { api: api as unknown as any } });
        await handler.handle(context);
        assertEquals(JSON.parse(context.response.body as string).visibility, "unlisted");

        // Neither
        scenario = mockScenario({ published: false, unlisted: false });
        // @ts-ignore: stubbing method
        api.getScenarioEmbed = () => Promise.resolve(scenario);
        context = createMockContext({ params: { id: "3" }, state: { api: api as unknown as any } });
        await handler.handle(context);
        assertEquals(JSON.parse(context.response.body as string).visibility, undefined);
    });
});
