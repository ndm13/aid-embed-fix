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

    it("should strip null characters from payloads before sending to Supabase", async () => {
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
            // Record an entry with null characters
            await analyticsCollector?.record({
                content: { id: "id\0with\0nulls", type: "scenario" },
                request: { params: { "key\0with\0nulls": "value\0with\0nulls" } } as any,
                timestamp: Date.now()
            });

            await new Promise((resolve) => setTimeout(resolve, 50));
            await analyticsCollector?.cleanup();

            const ingestRequest = fetchSupabaseCalls[1];
            assertExists(ingestRequest, "Supabase API call should have been made");

            const payload = ingestRequest.payload;
            assertEquals(payload.length, 1);

            // Check that null characters are stripped
            const entry = payload[0];
            assertEquals(entry.content.id, "idwithnulls");
            assertEquals(entry.request.params["keywithnulls"], "valuewithnulls");
            assertEquals(Object.keys(entry.request.params)[0], "keywithnulls");

        } finally {
            abortController.abort();
            await analyticsCollector?.cleanup();
        }
    });

    it("should gracefully handle external ingestion failures by re-buffering and dumping to console on exit", async () => {
        let currentTime = 1000000000000;
        Date.now = () => {
            currentTime += 100; // Increment time on each call
            return currentTime;
        };

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
        const loggedOutput: string[] = [];
        console.log = (msg: string) => { loggedOutput.push(msg); };

        try {
            const time1 = Date.now();
            const time2 = Date.now();

            // Record two entries, ensuring insertion order is different from timestamp order
            await analyticsCollector?.record({
                content: { id: "found-unlisted", type: "scenario" },
                request: { params: {} } as any,
                timestamp: time2
            });
            await new Promise((resolve) => setTimeout(resolve, 50));

            await analyticsCollector?.record({
                content: { id: "found-published", type: "scenario" },
                request: { params: {} } as any,
                timestamp: time1
            });
            await new Promise((resolve) => setTimeout(resolve, 50));

            // Simulate RPC endpoint failure
            setSupabaseShouldFail(true);

            // This will fail, re-buffer, and then the cleanup's shutdown logic will dump to console
            await analyticsCollector?.cleanup();

            // Filter for the JSON logs we expect, as other logs may be present
            const jsonLogs = loggedOutput
                .map(line => {
                    try { return JSON.parse(line); } catch { return null; }
                })
                .filter(item => item && (item.content?.id === "found-published" || item.content?.id === "found-unlisted"));

            // Should be two separate log entries
            assertEquals(jsonLogs.length, 2);

            // Entries should be sorted by timestamp ascending
            assertEquals(jsonLogs[0].content.id, "found-published");
            assertEquals(jsonLogs[1].content.id, "found-unlisted");

        } finally {
            console.log = originalLog;
            abortController.abort();
            await analyticsCollector?.cleanup();
        }
    });

    it("should handle sanitization and RPC failures separately", async () => {
        let currentTime = 1000000000000;
        Date.now = () => {
            currentTime += 100;
            return currentTime;
        };

        const analyticsCollector = await AnalyticsCollector.create(api, {
            supabaseUrl: "https://mock.supabase.co",
            supabaseKey: "mock-key",
            ingestSecret: "mock-secret",
            processingInterval: 300000,
            cacheExpiration: 3600000
        });

        const originalLog = console.log;
        const loggedOutput: string[] = [];
        console.log = (msg: string) => { loggedOutput.push(msg); };

        try {
            // Record a mix of valid and invalid entries
            await analyticsCollector.record({
                content: { id: "valid-entry-1", type: "scenario" },
                request: { params: {} } as any,
                timestamp: Date.now()
            });
            await analyticsCollector.record({
                content: { id: "invalid-entry", type: "scenario" },
                request: { params: {} } as any,
                timestamp: null as any // This will cause a sanitization error
            });
            await analyticsCollector.record({
                content: { id: "valid-entry-2", type: "scenario" },
                request: { params: {} } as any,
                timestamp: Date.now()
            });

            await new Promise((resolve) => setTimeout(resolve, 50));

            // Simulate an RPC failure
            setSupabaseShouldFail(true);
            await analyticsCollector.cleanup();

            // Find the warning message indices to split the logs
            const bufferWarningIndex = loggedOutput.findIndex(l => l.includes("Unable to send analytics to Supabase"));
            const failedWarningIndex = loggedOutput.findIndex(l => l.includes("Failed to sanitize") && l.includes("entries"));

            assertExists(bufferWarningIndex > -1, "Warning for buffered entries should be present");
            assertExists(failedWarningIndex > -1, "Warning for failed entries should be present");

            // Extract and parse the logs for the buffered (RPC failed) entries
            const bufferedLogLines = loggedOutput.slice(bufferWarningIndex + 1, failedWarningIndex);
            const bufferedEntries = bufferedLogLines.map(line => JSON.parse(line));
            
            assertEquals(bufferedEntries.length, 2);
            assertEquals(bufferedEntries[0].content.id, "valid-entry-1");
            assertEquals(bufferedEntries[1].content.id, "valid-entry-2");

            // Extract and parse the logs for the failed (sanitization failed) entries
            const failedLogLines = loggedOutput.slice(failedWarningIndex + 1);
            const failedEntries = failedLogLines.map(line => JSON.parse(line));

            assertEquals(failedEntries.length, 1);
            assertEquals(failedEntries[0].content.id, "invalid-entry");

        } finally {
            console.log = originalLog;
            await analyticsCollector.cleanup();
        }
    });
});
