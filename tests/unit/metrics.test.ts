import { describe, it } from "@std/testing/bdd";
import { assertEquals } from "@std/assert";

import { MetricsCollector } from "../../src/support/MetricsCollector.ts";

describe("MetricsCollector Unit Tests", () => {
    it("should safely return empty objects when getting stats before any data is recorded", () => {
        const collector = new MetricsCollector({
            scopes: { api: true, router: true },
            window: 1000
        });

        assertEquals(collector.api, {});
        assertEquals(collector.router, {});

        collector.cleanup();
    });

    it("should successfully prune all timed out elements", async () => {
        const windowTime = 100;
        const collector = new MetricsCollector({
            scopes: { api: true, router: true },
            window: windowTime
        });

        // Record a few entries
        collector.recordAPICall("testMethod", 10, "success");
        collector.recordEndpoint("/test", 5, "success");

        // Fast-forward time to guarantee everything expires
        const originalDateNow = Date.now;
        Date.now = () => originalDateNow() + 200;

        try {
            // Trigger a read, forcing PRUNE
            const apiStats = collector.api;
            const routerStats = collector.router;

            assertEquals(apiStats, {});
            assertEquals(routerStats, {});
        } finally {
            Date.now = originalDateNow;
            collector.cleanup();
        }
    });

    it("should cleanly prune items via the setInterval garabage collector", async () => {
        const windowTime = 50;
        const collector = new MetricsCollector({
            scopes: { api: true, router: true },
            window: windowTime
        });

        collector.recordAPICall("testMethod", 10, "success");

        // Let the collector's internal setInterval tick at least twice
        await new Promise(resolve => setTimeout(resolve, 120));

        const apiStats = collector.api;
        assertEquals(apiStats, {});

        collector.cleanup();
    });
});
