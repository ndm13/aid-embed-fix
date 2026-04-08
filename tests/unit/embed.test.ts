import { describe, it } from "@std/testing/bdd";
import { assertEquals } from "@std/assert";
import { EmbedHandler } from "../../src/handlers/EmbedHandler.ts";

describe("EmbedHandler Unit Tests", () => {
    // We subclass it basically to expose its static Cache and getPreview mechanics
    class TestEmbedHandler extends EmbedHandler<any> {
        name = "test";
        redirectKeys = ["test_id"];
        protected responseType = "scenario";
        protected oembedType = "rich";

        constructor() {
            // Mock environment that ignores template fetching
            super({ getTemplate: () => ({ render: () => "" }) } as any, "", "");
        }

        fetch(ctx: any, id: string): Promise<any> {
            return Promise.resolve({ id, content: "test" });
        }

        protected prepareContext(ctx: any, data: any): object {
            return { data };
        }

        // Public exposure for tested state
        get _previewCache() {
            return EmbedHandler.previewCache;
        }

        // Exposing specific protected calls
        public async testGetPreview(id: string, cacheId: string) {
            return await this.getPreview({ request: { url: new URL("http://localhost/") } } as any, id, cacheId);
        }
    }

    it("should enforce the MAX_CACHE_SIZE limit by pruning the oldest LRU element during rapid insertion", async () => {
        const handler = new TestEmbedHandler();
        handler._previewCache.clear();

        for (let i = 0; i < 105; i++) {
            await handler.testGetPreview(`id-${i}`, `cache-${i}`);
        }

        // Max is rigidly set to 100 in EmbedHandler
        assertEquals(handler._previewCache.size, 100);

        // LRU check: element 0 should be gone because it's first-in-first-out, element 104 should be present
        assertEquals(handler._previewCache.has("cache-0"), false);
        assertEquals(handler._previewCache.has("cache-104"), true);
    });

    it("should refresh timestamps correctly on secondary cache hits causing it to survive LRU sweeps", async () => {
        const handler = new TestEmbedHandler();
        handler._previewCache.clear();

        // Target: insert 0
        await handler.testGetPreview(`id-0`, `cache-0`);

        // Target: insert 99 more
        for (let i = 1; i < 100; i++) {
            await handler.testGetPreview(`id-${i}`, `cache-${i}`);
        }

        assertEquals(handler._previewCache.size, 100);

        // Fetch index 0 AGAIN to refresh it to the back of the Maps iterator line
        await handler.testGetPreview(`id-0`, `cache-0`);

        // Insert index 100
        await handler.testGetPreview(`id-100`, `cache-100`);

        // Assert 0 survived, but 1 was destroyed instead
        assertEquals(handler._previewCache.has("cache-0"), true);
        assertEquals(handler._previewCache.has("cache-100"), true);
        assertEquals(handler._previewCache.has("cache-1"), false);
    });
});
