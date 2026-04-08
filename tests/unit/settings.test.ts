import { describe, it } from "@std/testing/bdd";
import { assertEquals } from "@std/assert";
import { FakeTime } from "@std/testing/time";
import { router, SyncToken } from "../../src/middleware/settings.ts";

describe("Settings TTL Unit Tests", () => {
    it("should garbage collect syncTokens when strictly 60 seconds have elapsed", async () => {
        const time = new FakeTime();
        try {
            const syncTokens = new Map<string, SyncToken>();
            const settingsRouter = router(syncTokens);
            
            syncTokens.set("test-token-1", {
                proxy: JSON.stringify({ landing: "client" }),
                timestamp: Date.now()
            });
            syncTokens.set("test-token-2", {
                proxy: JSON.stringify({ landing: "preview" }),
                timestamp: Date.now() // Inserted at FakeTime 0
            });

            time.tick(50000);
            
            // Trigger passive sweep by firing a request against the router
            // Catch anything because it will throw `ctx.response.body` errors on the mocked ctx
            try { await settingsRouter.routes()({ request: { method: "GET", url: new URL("http://localhost/sync") }, response: {} } as any, () => Promise.resolve()); } catch (e) {}
            
            assertEquals(syncTokens.has("test-token-1"), true);
            assertEquals(syncTokens.has("test-token-2"), true);

            // Wait another 20 seconds (Total 70s)
            time.tick(20000);

            // Trigger passive sweep
            try { await settingsRouter.routes()({ request: { method: "GET", url: new URL("http://localhost/sync") }, response: {} } as any, () => Promise.resolve()); } catch (e) {}

            assertEquals(syncTokens.has("test-token-1"), false);
            assertEquals(syncTokens.has("test-token-2"), false);
        } finally {
            time.restore();
        }
    });
});
