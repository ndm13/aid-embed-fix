import { assertEquals, assertExists } from "@std/assert";
import { afterEach, describe, it } from "@std/testing/bdd";
import { MetricsCollector, MetricsConfig } from "@/src/support/MetricsCollector.ts";
import { FakeTime } from "@std/testing/time";
import { APIResult, EndpointResponseType } from "@/src/types/MetricsTypes.ts";

describe("MetricsCollector", () => {
    let collector: MetricsCollector;

    afterEach(() => {
        collector?.cleanup();
    });

    const config: MetricsConfig = {
        scopes: {
            api: true,
            router: true
        },
        window: 1000
    };

    it("should record and report router metrics", () => {
        collector = new MetricsCollector(config);
        collector.recordEndpoint("/test", 100, "success" as EndpointResponseType);
        collector.recordEndpoint("/test", 200, "success" as EndpointResponseType);
        collector.recordEndpoint("/another", 300, "redirect" as EndpointResponseType);

        const metrics = collector.router;
        assertExists(metrics.timings);
        assertEquals(metrics.timings.requests, 3);
        assertEquals(metrics.timings.avg, 200);
        assertEquals(metrics.timings.max, 300);

        assertExists(metrics.endpoints);
        assertExists(metrics.endpoints["/test"]);
        assertEquals(metrics.endpoints["/test"].timings.requests, 2);
        assertEquals(metrics.endpoints["/test"].timings.avg, 150);
        assertEquals(metrics.endpoints["/test"].timings.max, 200);
        assertEquals(metrics.endpoints["/test"].type.success, 2);

        assertExists(metrics.endpoints["/another"]);
        assertEquals(metrics.endpoints["/another"].timings.requests, 1);
        assertEquals(metrics.endpoints["/another"].timings.avg, 300);
        assertEquals(metrics.endpoints["/another"].timings.max, 300);
        assertEquals(metrics.endpoints["/another"].type.redirect, 1);
    });

    it("should record and report API metrics", () => {
        collector = new MetricsCollector(config);
        collector.recordAPICall("getAdventureEmbed", 50, "success");
        collector.recordAPICall("getAdventureEmbed", 150, "success");
        collector.recordAPICall("getUserProfile", 200, "api_error" as APIResult);

        const metrics = collector.api;
        assertExists(metrics.timings);
        assertEquals(metrics.timings.requests, 3);
        assertEquals(metrics.timings.avg, 133.33);
        assertEquals(metrics.timings.max, 200);

        assertExists(metrics.methods);
        assertExists(metrics.methods["getAdventureEmbed"]);
        assertEquals(metrics.methods["getAdventureEmbed"].timings.requests, 2);
        assertEquals(metrics.methods["getAdventureEmbed"].timings.avg, 100);
        assertEquals(metrics.methods["getAdventureEmbed"].timings.max, 150);
        assertEquals(metrics.methods["getAdventureEmbed"].results.success, 2);

        assertExists(metrics.methods["getUserProfile"]);
        assertEquals(metrics.methods["getUserProfile"].timings.requests, 1);
        assertEquals(metrics.methods["getUserProfile"].timings.avg, 200);
        assertEquals(metrics.methods["getUserProfile"].timings.max, 200);
        assertEquals(metrics.methods["getUserProfile"].results.api_error, 1);
    });

    it("should prune old data", async () => {
        using time = new FakeTime();
        collector = new MetricsCollector({ ...config, window: 500 });

        collector.recordEndpoint("/test", 100, "success" as EndpointResponseType);
        await time.tickAsync(300);
        collector.recordEndpoint("/test", 200, "success" as EndpointResponseType);

        assertEquals(collector.router.timings?.requests, 2);

        await time.tickAsync(300); // Total time is 600ms, first request is older than 500ms

        const metrics = collector.router;
        assertEquals(metrics.timings?.requests, 1);
        assertEquals(metrics.timings?.avg, 200);
    });

    it("should prune all data if all data is old", async () => {
        using time = new FakeTime();
        collector = new MetricsCollector({ ...config, window: 500 });

        collector.recordEndpoint("/test", 100, "success" as EndpointResponseType);
        await time.tickAsync(600); // All data is older than the 500ms window

        assertEquals(collector.router, {});
    });

    it("should handle empty metrics correctly", () => {
        collector = new MetricsCollector(config);
        assertEquals(collector.router, {});
        assertEquals(collector.api, {});
    });

    it("should not record metrics if scopes are disabled", () => {
        const disabledConfig: MetricsConfig = {
            scopes: {
                api: false,
                router: false
            },
            window: 1000
        };
        collector = new MetricsCollector(disabledConfig);
        collector.recordEndpoint("/test", 100, "success" as EndpointResponseType);
        collector.recordAPICall("getStuff", 50, "success");

        assertEquals(collector.router, {});
        assertEquals(collector.api, {});
    });
});
