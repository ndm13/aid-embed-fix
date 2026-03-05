import { assertEquals, assertExists } from "@std/assert";
import { afterEach, beforeEach, describe, it } from "@std/testing/bdd";
import { FakeTime } from "@std/testing/time";
import { Context } from "@oak/oak";
import { Environment, Template } from "npm:nunjucks";
import { spy } from "@std/testing/mock";

import { EmbedHandler } from "@/src/handlers/EmbedHandler.ts";
import { AppState } from "@/src/types/AppState.ts";
import { createMockContext } from "../../mocks/context.ts";
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

class TestEmbedHandler extends EmbedHandler<any> {
    readonly name = "test";
    readonly redirectKeys = ["foo"];
    protected responseType: string = "scenario"; // Must be one of 'scenario', 'adventure', 'profile' for caching
    protected readonly oembedType = "Test";

    constructor(env: Environment) {
        super(env, "success.njk", "error.njk");
    }

    fetch(_ctx: Context<AppState>, _id: string): Promise<any> {
        return Promise.resolve({ id: "test-id", title: "Test Title", published: true });
    }

    protected prepareContext(_ctx: Context<AppState>, data: any): object {
        return data;
    }
}

describe("EmbedHandler", () => {
    const env = new MockEnvironment() as unknown as Environment;

    beforeEach(() => {
        // Clear cache before each test
        (EmbedHandler as any).previewCache.clear();
    });

    describe("Caching", () => {
        it("should cache responses", async () => {
            const handler = new TestEmbedHandler(env);
            const fetchSpy = spy(handler, "fetch");
            const context = createMockContext({ params: { id: "1" }, query: { preview: "true" } });

            await handler.handle(context);
            assertEquals(fetchSpy.calls.length, 1);

            await handler.handle(context);
            assertEquals(fetchSpy.calls.length, 1);
        });

        it("should expire cache entries", async () => {
            using time = new FakeTime();
            const handler = new TestEmbedHandler(env);
            const fetchSpy = spy(handler, "fetch");
            const context = createMockContext({ params: { id: "1" }, query: { preview: "true" } });

            await handler.handle(context);
            assertEquals(fetchSpy.calls.length, 1);

            await time.tickAsync(1000 * 60 * 5 + 100);

            await handler.handle(context);
            assertEquals(fetchSpy.calls.length, 2);
        });

        it("should bypass cache on visibility mismatch", async () => {
            const handler = new TestEmbedHandler(env);
            const fetchSpy = spy(handler, "fetch");
            
            const context1 = createMockContext({ params: { id: "1" }, query: { preview: "true", published: "true" } });
            await handler.handle(context1);
            assertEquals(fetchSpy.calls.length, 1);

            const context2 = createMockContext({ params: { id: "1" }, query: { preview: "true", unlisted: "true" } });
            await handler.handle(context2);
            assertEquals(fetchSpy.calls.length, 2);
        });

        it("should bypass cache for non-standard types", async () => {
            class CustomEmbedHandler extends TestEmbedHandler {
                protected override readonly responseType = "custom";
            }
            const handler = new CustomEmbedHandler(env);
            const fetchSpy = spy(handler, "fetch");
            const context = createMockContext({ params: { id: "1" }, query: { preview: "true" } });

            await handler.handle(context);
            await handler.handle(context);
            assertEquals(fetchSpy.calls.length, 2);
        });

        it("should evict old entries when max size reached", async () => {
            const handler = new TestEmbedHandler(env);
            const fetchSpy = spy(handler, "fetch");
            const MAX_CACHE_SIZE = 100;

            for (let i = 0; i < MAX_CACHE_SIZE; i++) {
                const context = createMockContext({ params: { id: `id-${i}` }, query: { preview: "true" } });
                await handler.handle(context);
            }
            assertEquals(fetchSpy.calls.length, MAX_CACHE_SIZE);

            const contextNew = createMockContext({ params: { id: "id-new" }, query: { preview: "true" } });
            await handler.handle(contextNew);
            assertEquals(fetchSpy.calls.length, MAX_CACHE_SIZE + 1);

            const contextOld = createMockContext({ params: { id: "id-0" }, query: { preview: "true" } });
            await handler.handle(contextOld);
            assertEquals(fetchSpy.calls.length, MAX_CACHE_SIZE + 2);
        });
    });

    describe("Redirection Logic", () => {
        it("should redirect human users", async () => {
            const handler = new TestEmbedHandler(env);
            const context = createMockContext({ userAgent: "Mozilla/5.0" });
            await handler.handle(context);
            assertEquals(context.response.status, 301);
        });

        it("should NOT redirect bots", async () => {
            const handler = new TestEmbedHandler(env);
            const context = createMockContext({ userAgent: "Discordbot/2.0" });
            await handler.handle(context);
            assertEquals(context.response.status, 200);
        });
    });

    describe("Error Handling", () => {
        it("should handle network errors", async () => {
            const handler = new TestEmbedHandler(env);
            // @ts-ignore: mocking fetch
            handler.fetch = () => MockAIDungeonAPI.netError();
            const context = createMockContext({ query: { preview: "true" } });

            await handler.handle(context);
            assertEquals(context.state.analytics.content?.status, "net_error");
        });
    });
});
