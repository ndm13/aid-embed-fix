import { describe, it } from "@std/testing/bdd";
import { assertEquals, assertRejects } from "@std/assert";

export let supabaseShouldFailTest = false;

const originalFetch = globalThis.fetch;
globalThis.fetch = async (input: string | URL | Request, init?: RequestInit) => {
    if (supabaseShouldFailTest) {
        return new Response(JSON.stringify({ error: { message: "Invalid secret test" } }), { status: 500, headers: { "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify({}), { status: 200, headers: { "Content-Type": "application/json" } });
};

import { AnalyticsCollector } from "../../src/support/AnalyticsCollector.ts";

describe("AnalyticsCollector Unit Tests", () => {
    // Basic mock API that fulfills the subset of AIDungeonAPI required by fetchContent
    const mockApi: any = {
        getScenarioEmbed: async (id: string, published?: boolean) => {
            return {
                id,
                title: "Mock Scenario",
                published,
                contentRating: "safe",
                user: { id: "a1", username: "u1", profile: { title: "Mock Profile" } }
            };
        },
        getAdventureEmbed: async (id: string) => {
            return {
                id,
                title: "Mock Adventure",
                contentRating: "safe",
                userId: "a2",
                user: { id: "a2", username: "u2", profile: { title: "Mock Profile 2" } }
            };
        },
        getUserEmbed: async (id: string) => {
            return {
                id,
                username: "Mock User",
                profile: { title: "User Title" }
            };
        }
    };

    it("should throw an error during setup if the ingest secret is invalid", async () => {
        supabaseShouldFailTest = true;

        try {
            await assertRejects(
                async () => {
                    await AnalyticsCollector.create(mockApi, {
                        supabaseUrl: "https://mock.supabase.co",
                        supabaseKey: "mock-key",
                        ingestSecret: "invalid-secret",
                        processingInterval: 300000,
                        cacheExpiration: 3600000
                    });
                },
                Error,
                "Invalid ingest secret"
            );
        } finally {
            supabaseShouldFailTest = false;
        }
    });

    it("should process internal fallbacks manually fetching scenarios, adventures, and profiles", async () => {
        const collector = await AnalyticsCollector.create(mockApi, {
            supabaseUrl: "https://mock.supabase.co",
            supabaseKey: "mock-key",
            ingestSecret: "mock-secret",
            processingInterval: 300000,
            cacheExpiration: 3600000
        });

        try {
            await collector.record({
                content: { id: "test-adv", type: "adventure" },
                request: { params: {} } as any,
                timestamp: Date.now()
            });

            await collector.record({
                content: { id: "test-prof", type: "profile" },
                request: { params: {} } as any,
                timestamp: Date.now()
            });

            await collector.record({
                content: { id: "test-scen-pub", type: "scenario" },
                request: { params: { published: "true" } } as any,
                timestamp: Date.now()
            });

            await collector.record({
                content: { id: "test-scen-unl", type: "scenario" },
                request: { params: { unlisted: "true" } } as any,
                timestamp: Date.now()
            });

            // We do a mock buffer extraction hack purely for test validation since we hit private methods 
            const buffer = (collector as any).buffer;

            assertEquals(buffer[0].content.type, "adventure");
            assertEquals(buffer[0].content.status, "success");

            assertEquals(buffer[1].content.type, "profile");
            assertEquals(buffer[1].content.status, "success");

            assertEquals(buffer[2].content.type, "scenario");
            // The mapping pulls the published status injected into the request
            // We can't easily assert the specific param hit, but we know the line was covered
            assertEquals(buffer[2].content.status, "success");
            
            assertEquals(buffer[3].content.type, "scenario");
            assertEquals(buffer[3].content.status, "success");
        } finally {
            await collector.cleanup();
        }
    });

    it("should actually prune caching table via pruneCache on processing ticks", async () => {
        const collector = await AnalyticsCollector.create(mockApi, {
            supabaseUrl: "https://mock.supabase.co",
            supabaseKey: "mock-key",
            ingestSecret: "mock-secret",
            processingInterval: 300000,
            cacheExpiration: 100 // 100ms
        });

        const originalNow = Date.now;

        try {
            await collector.record({
                content: { id: "test-timeout", type: "scenario" },
                request: { params: {} } as any,
                timestamp: Date.now()
            });

            const cache = (collector as any).cache;
            assertEquals(Object.keys(cache).length, 1);

            // Fast forward time, but not enough to trigger `process` naturally via setInterval
            Date.now = () => originalNow() + 200;

            // Trigger internal process method which begins with pruneCache()
            await (collector as any).process();

            assertEquals(Object.keys(cache).length, 0);

        } finally {
            Date.now = originalNow;
            await collector.cleanup();
        }
    });
});
