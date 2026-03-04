import { assertEquals } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import { FakeTime } from "@std/testing/time";
import { Context } from "@oak/oak";
import { Environment, Template } from "npm:nunjucks";
import { spy } from "@std/testing/mock";

import { EmbedHandler } from "@/src/handlers/EmbedHandler.ts";
import { AppState } from "@/src/types/AppState.ts";
import { createTestContext } from "../test_utils.ts";

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
    protected readonly responseType = "scenario"; // Must be one of 'scenario', 'adventure', 'profile' for caching
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

    describe("Caching", () => {
        it("should cache responses", async () => {
            const handler = new TestEmbedHandler(env);
            const fetchSpy = spy(handler, "fetch");
            // Use a unique ID to avoid interference from other tests if cache is shared
            const id = "cache-test-1";
            // Use cacheId (last param of getPreview) as the key
            const context = createTestContext({}, { id }, `http://localhost/test/${id}?preview=true`);

            // First call
            await handler.handle(context);
            assertEquals(fetchSpy.calls.length, 1);

            // Second call (should hit cache)
            await handler.handle(context);
            assertEquals(fetchSpy.calls.length, 1);
        });

        it("should expire cache entries", async () => {
            using time = new FakeTime();
            const handler = new TestEmbedHandler(env);
            const fetchSpy = spy(handler, "fetch");
            const id = "cache-test-2";
            const context = createTestContext({}, { id }, `http://localhost/test/${id}?preview=true`);

            // First call
            await handler.handle(context);
            assertEquals(fetchSpy.calls.length, 1);

            // Advance time past TTL (5 minutes)
            await time.tickAsync(1000 * 60 * 5 + 100);

            // Second call (should refetch)
            await handler.handle(context);
            assertEquals(fetchSpy.calls.length, 2);
        });

        it("should bypass cache if visibility mismatch", async () => {
            const handler = new TestEmbedHandler(env);
            const fetchSpy = spy(handler, "fetch");
            const id = "cache-test-3";
            
            // First call (published)
            const context1 = createTestContext({}, { id }, `http://localhost/test/${id}?preview=true&published=true`);
            await handler.handle(context1);
            assertEquals(fetchSpy.calls.length, 1);

            // Second call (unlisted) - should refetch
            const context2 = createTestContext({}, { id }, `http://localhost/test/${id}?preview=true&unlisted=true`);
            await handler.handle(context2);
            assertEquals(fetchSpy.calls.length, 2);
        });
    });

    describe("Redirection Logic", () => {
        it("should redirect human users", async () => {
            const handler = new TestEmbedHandler(env);
            const context = createTestContext({}, { id: "1" }, "http://localhost/test/1");
            // @ts-ignore: userAgent is not on the mock type but is used by the handler
            context.request.userAgent = { ua: "Mozilla/5.0" };

            await handler.handle(context);
            assertEquals(context.response.status, 301);
        });

        it("should NOT redirect bots", async () => {
            const handler = new TestEmbedHandler(env);
            const context = createTestContext({}, { id: "1" }, "http://localhost/test/1");
            // @ts-ignore: userAgent is not on the mock type but is used by the handler
            context.request.userAgent = { ua: "Discordbot/2.0" };

            await handler.handle(context);
            assertEquals(context.response.status, 200);
        });

        it("should NOT redirect if ?preview=true", async () => {
            const handler = new TestEmbedHandler(env);
            const context = createTestContext({}, { id: "1" }, "http://localhost/test/1?preview=true");
            // @ts-ignore: userAgent is not on the mock type but is used by the handler
            context.request.userAgent = { ua: "Mozilla/5.0" };

            await handler.handle(context);
            assertEquals(context.response.status, 200);
        });

        it("should NOT redirect if ?no_ua", async () => {
            const handler = new TestEmbedHandler(env);
            const context = createTestContext({}, { id: "1" }, "http://localhost/test/1?no_ua");
            // @ts-ignore: userAgent is not on the mock type but is used by the handler
            context.request.userAgent = { ua: "Mozilla/5.0" };

            await handler.handle(context);
            assertEquals(context.response.status, 200);
        });

        it("should respect proxy settings (landing=client)", async () => {
            const handler = new TestEmbedHandler(env);
            const context = createTestContext({
                settings: { proxy: { landing: "client", env: "prod" } }
            }, { id: "1" }, "http://localhost/test/1");
            // @ts-ignore: userAgent is not on the mock type but is used by the handler
            context.request.userAgent = { ua: "Discordbot/2.0" };

            await handler.handle(context);
            // landing=client means "Force client-side redirect", so it should NOT forward (301) but render the page (200)
            // which presumably contains client-side redirect logic (though the mock template just renders JSON)
            // Wait, looking at EmbedHandler.ts:
            // case "client":  // Force client-side redirect
            //     return false;
            // So shouldForward returns false, so tryForward returns false, so it renders the template.
            assertEquals(context.response.status, 200);
        });

        it("should respect proxy settings (landing=preview)", async () => {
            const handler = new TestEmbedHandler(env);
            const context = createTestContext({
                settings: { proxy: { landing: "preview", env: "prod" } }
            }, { id: "1" }, "http://localhost/test/1");
            // @ts-ignore: userAgent is not on the mock type but is used by the handler
            context.request.userAgent = { ua: "Mozilla/5.0" };

            await handler.handle(context);
            assertEquals(context.response.status, 200);
        });
    });
});
