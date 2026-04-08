import { describe, it, beforeEach, afterEach } from "@std/testing/bdd";
import { assertEquals, assertExists, assertMatch } from "@std/assert";
import { superoak } from "superoak";

import { buildApp } from "../../src/server.ts";
import { createDiscordRequest, fetchSupabaseCalls, resetFetchCalls, setSupabaseShouldFail, api } from "./setup.ts";
import { AnalyticsCollector } from "../../src/support/AnalyticsCollector.ts";

describe("Analytics Integration", () => {
    let originalDateNow: () => number;
    
    beforeEach(() => {
        resetFetchCalls();
        setSupabaseShouldFail(false);
        originalDateNow = Date.now;
    });
    
    afterEach(() => {
        Date.now = originalDateNow;
    });

    it("should capture requests and map content seamlessly to ingest Supabase endpoints", async () => {
        const analyticsCollector = await AnalyticsCollector.create(api, {
            supabaseUrl: "https://mock.supabase.co",
            supabaseKey: "mock-key",
            ingestSecret: "mock-secret",
            processingInterval: 300000,
            cacheExpiration: 3600000
        });

        const app = buildApp({
            api,
            analyticsCollector,
            config: {
                oembedProtocol: "https",
                redirectBase: "https://mock.aidungeon.com"
            }
        });
        const abortController = new AbortController();

        try {
            // Scenario success
            await createDiscordRequest((await superoak(app)).get("/scenario/found-published/test-tail")).expect(200);
            // Cache hit branch from routing level
            await createDiscordRequest((await superoak(app)).get("/scenario/found-published/test-tail")).expect(200);
            // Scenario 404
            await createDiscordRequest((await superoak(app)).get("/scenario/not-found/test-tail")).expect(200);
            // Scenario unlisted
            await createDiscordRequest((await superoak(app)).get("/scenario/found-unlisted/test-tail")).expect(200);
            // Preview bypassed (should not hit analytics at all)
            await createDiscordRequest((await superoak(app)).get("/scenario/found-published/test-tail?preview=true")).expect(200);
            // GraphQL Error -> api_error
            await createDiscordRequest((await superoak(app)).get("/scenario/server-error/test-tail")).expect(200);
            
            // Adventure success
            await createDiscordRequest((await superoak(app)).get("/adventure/found-published/test-tail")).expect(200);
            // Profile success
            await createDiscordRequest((await superoak(app)).get("/profile/found-user")).expect(200);
            
            // Invalid content type manually pushed to test TypeError catch block
            await analyticsCollector?.record({
                content: { id: "invalid-id", type: "unknown-type" },
                request: { hostname: "localhost", path: "/test", params: {}, middleware: "test", userAgent: "test" },
                timestamp: Date.now()
            });

            // Wait for any async processes
            await new Promise((resolve) => setTimeout(resolve, 100));

            // Force evaluation
            await analyticsCollector?.cleanup();

            const ingestRequest = fetchSupabaseCalls[1];
            assertExists(ingestRequest, "Supabase API call should log successfully");
            
            const payload = ingestRequest.payload;
            
            // Expected payload items:
            // 0: found-published, 1: found-published (cache), 2: not-found
            // 3: found-unlisted, 4: server-error, 5: adventure, 6: profile, 7: unknown-type
            assertEquals(payload.length, 8);

            assertEquals(payload[0].content.id, "found-published");
            assertEquals(payload[0].content.type, "scenario");
            assertEquals(payload[0].content.status, "success");

            assertEquals(payload[1].content.id, "found-published");
            assertEquals(payload[1].content.status, "success"); 

            assertEquals(payload[2].content.id, "not-found");
            assertEquals(payload[2].content.status, "api_error");

            assertEquals(payload[3].content.id, "found-unlisted");
            assertEquals(payload[3].content.status, "success");
            
            assertEquals(payload[4].content.id, "server-error");
            assertEquals(payload[4].content.status, "api_error");
            
            assertEquals(payload[5].content.type, "adventure");
            assertEquals(payload[5].content.id, "found-published");
            assertEquals(payload[5].content.status, "success");

            assertEquals(payload[6].content.type, "profile");
            assertEquals(payload[6].content.id, "found-user");
            assertEquals(payload[6].content.status, "success");
            
            assertEquals(payload[7].content.type, "unknown-type");
            assertEquals(payload[7].content.status, "api_error");

        } finally {
            abortController.abort();
            // Suppress double cleanup error print if running
            await analyticsCollector?.cleanup(); 
        }
    });

    it("should handle AnalyticsCollector internal cache misses, hits, and expiration automatically", async () => {
        let currentTime = 1000000000000;
        Date.now = () => currentTime;
        
        const analyticsCollector = await AnalyticsCollector.create(api, {
            supabaseUrl: "https://mock.supabase.co",
            supabaseKey: "mock-key",
            ingestSecret: "mock-secret",
            processingInterval: 300000,
            cacheExpiration: 3600000
        });

        const app = buildApp({
            api,
            analyticsCollector,
            config: {
                oembedProtocol: "https",
                redirectBase: "https://mock.aidungeon.com"
            }
        });
        const abortController = new AbortController();

        try {
            // First record triggers fetch
            await analyticsCollector?.record({
                content: { id: "found-published", type: "scenario" },
                request: { params: {} } as any,
                timestamp: Date.now()
            });
            await new Promise((resolve) => setTimeout(resolve, 50));

            // Immediately hit cache
            await analyticsCollector?.record({
                content: { id: "found-published", type: "scenario" },
                request: { params: {} } as any,
                timestamp: Date.now()
            });
            await new Promise((resolve) => setTimeout(resolve, 50));

            // Advance time past expiration (1 hour = 3600000 ms)
            currentTime += 4000000;

            // Cache miss due to time expiration
            await analyticsCollector?.record({
                content: { id: "found-published", type: "scenario" },
                request: { params: {} } as any,
                timestamp: Date.now()
            });
            await new Promise((resolve) => setTimeout(resolve, 50));

            await analyticsCollector?.cleanup();

            const payload = fetchSupabaseCalls[1].payload;
            assertEquals(payload.length, 3);
            
            assertEquals(payload[0].content.status, "success");
            assertEquals(payload[1].content.status, "cache");
            assertEquals(payload[2].content.status, "success");
        } finally {
            abortController.abort();
            await analyticsCollector?.cleanup();
        }
    });

    it("should gracefully handle external ingestion failures by re-buffering and dumping to console on exit", async () => {
        const analyticsCollector = await AnalyticsCollector.create(api, {
            supabaseUrl: "https://mock.supabase.co",
            supabaseKey: "mock-key",
            ingestSecret: "mock-secret",
            processingInterval: 300000,
            cacheExpiration: 3600000
        });

        const app = buildApp({
            api,
            analyticsCollector,
            config: {
                oembedProtocol: "https",
                redirectBase: "https://mock.aidungeon.com"
            }
        });
        const abortController = new AbortController();

        const originalLog = console.log;
        let loggedOutput = "";
        console.log = (msg: string) => { loggedOutput += msg; };

        try {
            await analyticsCollector?.record({
                content: { id: "found-published", type: "scenario" },
                request: { params: {} } as any,
                timestamp: Date.now()
            });
            await new Promise((resolve) => setTimeout(resolve, 50));

            // Simulate RPC endpoint failure
            setSupabaseShouldFail(true);
            
            // Force a process, which will fail and re-buffer
            // Because cleanup shuts things down, it sees the failed re-buffering and dumps it using console.log
            await analyticsCollector?.cleanup();

            assertMatch(loggedOutput, /found-published/);

        } finally {
            console.log = originalLog;
            abortController.abort();
            await analyticsCollector?.cleanup();
        }
    });
});
