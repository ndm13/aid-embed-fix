import { assertEquals } from "@std/assert";
import { afterEach, beforeEach, describe, it } from "@std/testing/bdd";
import { assertSpyCall, assertSpyCalls, Spy, spy, stub } from "@std/testing/mock";
import { FakeTime } from "@std/testing/time";
import { AnalyticsCollector, AnalyticsConfig } from "@/src/support/AnalyticsCollector.ts";
import { AIDungeonAPI } from "@/src/api/AIDungeonAPI.ts";
import { AnalyticsEntry } from "@/src/types/ReportingTypes.ts";

// Mock API
describe("AnalyticsCollector", () => {
    let collector: AnalyticsCollector;
    let api: AIDungeonAPI;
    let time: FakeTime;
    let mockRpc: Spy;

    const config: AnalyticsConfig = {
        processingInterval: 1000,
        cacheExpiration: 5000,
        supabaseUrl: "https://example.com",
        supabaseKey: "test-key",
        ingestSecret: "test-secret"
    };

    beforeEach(async () => {
        time = new FakeTime();
        mockRpc = spy((_fn: string, _args: any) => Promise.resolve({ error: null }));
        const mockSupabase = {
            rpc: mockRpc
        };

        api = {
            getScenarioEmbed: spy(() => Promise.resolve({} as any)),
            getAdventureEmbed: spy(() => Promise.resolve({} as any)),
            getUserEmbed: spy(() => Promise.resolve({} as any))
        } as unknown as AIDungeonAPI;

        // Stub testSecret to avoid network call during creation
        const testSecretStub = stub(AnalyticsCollector.prototype, "testSecret" as any, () => Promise.resolve());

        try {
            // Instantiate collector
            collector = await AnalyticsCollector.create(api, config);
        } finally {
            testSecretStub.restore();
        }

        // Inject mock Supabase client (accessing private property via cast)
        (collector as any).supabase = mockSupabase;
    });

    afterEach(() => {
        collector.cleanup();
        time.restore();
    });

    it("should buffer entries and send them via RPC", async () => {
        const timestamp = Date.now();
        const entry: AnalyticsEntry = {
            content: { id: "123", type: "scenario", status: "success" },
            timestamp: timestamp,
            request: {
                userAgent: "test-agent",
                ip: "127.0.0.1",
                path: "/test"
            }
        } as any;

        await collector.record(entry);

        // Tick time to trigger process()
        await time.tickAsync(1100);

        assertSpyCalls(mockRpc, 1);
        assertSpyCall(mockRpc, 0, {
            args: ["ingest_analytics", {
                secret: "test-secret",
                payload: [{
                    ...entry,
                    timestamp: new Date(timestamp).toISOString()
                }]
            }]
        });
    });

    it("should fetch content if status is unknown", async () => {
        const entry: AnalyticsEntry = {
            content: { id: "456", type: "scenario", status: "unknown" },
            timestamp: Date.now()
        } as any;

        // Stub API response
        // We provide minimal data to satisfy the mapper
        const scenarioData = {
            title: "Test Scenario",
            user: { profile: { title: "author" } }
        };
        (api.getScenarioEmbed as any) = spy(() => Promise.resolve(scenarioData as any));

        await collector.record(entry);

        assertSpyCalls(api.getScenarioEmbed as any, 1);

        // Trigger process
        await time.tickAsync(1100);

        const call = mockRpc.calls[0];
        const payload = call.args[1].payload[0];
        assertEquals(payload.content.status, "success");
        assertEquals(payload.content.title, "Test Scenario");
    });

    it("should fetch user content if status is unknown", async () => {
        const entry: AnalyticsEntry = {
            content: { id: "user-123", type: "user", status: "unknown" },
            timestamp: Date.now()
        } as any;

        const userData = {
            profile: {
                title: "Test User"
            }
        };
        (api.getUserEmbed as any) = spy(() => Promise.resolve(userData as any));

        await collector.record(entry);

        assertSpyCalls(api.getUserEmbed as any, 1);

        await time.tickAsync(1100);

        const call = mockRpc.calls[0];
        const payload = call.args[1].payload[0];
        assertEquals(payload.content.status, "success");
        assertEquals(payload.content.title, "Test User");
    });

    it("should use cached content for subsequent requests", async () => {
        const entry1: AnalyticsEntry = {
            content: { id: "789", type: "adventure", status: "unknown" },
            timestamp: Date.now()
        } as any;

        (api.getAdventureEmbed as any) = spy(() => Promise.resolve({ title: "Adventure 1", user: {} } as any));

        // First record - fetches from API
        await collector.record(entry1);

        const entry2: AnalyticsEntry = {
            content: { id: "789", type: "adventure", status: "unknown" },
            timestamp: Date.now()
        } as any;

        // Second record - should use cache
        await collector.record(entry2);

        assertSpyCalls(api.getAdventureEmbed as any, 1);
    });

    it("should retry on Supabase error", async () => {
        const entry: AnalyticsEntry = {
            content: { id: "err", type: "user", status: "success" },
            timestamp: Date.now()
        } as any;

        // Mock RPC to fail once then succeed
        let callCount = 0;
        const flakyRpc = spy((_fn: string, _args: any) => {
            callCount++;
            if (callCount === 1) return Promise.resolve({ error: "Fail" });
            return Promise.resolve({ error: null });
        });
        (collector as any).supabase = { rpc: flakyRpc };

        await collector.record(entry);

        // First tick - fails, should re-buffer
        await time.tickAsync(1100);
        assertSpyCalls(flakyRpc, 1);

        // Second tick - succeeds
        await time.tickAsync(1100);
        assertSpyCalls(flakyRpc, 2);
    });

    it("should prune expired cache entries", async () => {
        const entry: AnalyticsEntry = {
            content: { id: "cache-test", type: "user", status: "success" },
            timestamp: Date.now()
        } as any;

        // Record entry to populate cache
        await collector.record(entry);

        // Verify it's in cache (accessing private cache)
        const cache = (collector as any).cache;
        assertEquals(!!cache["cache-test"], true);

        // Advance time past expiration (5000ms)
        await time.tickAsync(6000);

        // Trigger process which calls pruneCache
        // Note: process() runs on interval, so tickAsync(6000) triggered it multiple times
        assertEquals(!!cache["cache-test"], false);
    });
});
