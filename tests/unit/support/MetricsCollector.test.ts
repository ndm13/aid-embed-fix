import { assertEquals } from "@std/assert";
import { afterEach, describe, it } from "@std/testing/bdd";
import { FakeTime } from "@std/testing/time";

import { MetricsCollector } from "@/src/support/MetricsCollector.ts";

describe("MetricsCollector", () => {
    let collector: MetricsCollector;
    let time: FakeTime;

    afterEach(() => {
        collector?.cleanup();
        time?.restore();
    });

    it("should record and report router metrics", () => {
        collector = new MetricsCollector({ scopes: { router: true, api: false }, window: 1000 });
        collector.recordEndpoint("test", 100, "success");
        collector.recordEndpoint("test", 200, "success");

        const metrics = collector.router as any;
        assertEquals(metrics.timings.requests, 2);
        assertEquals(metrics.timings.avg, 150);
        assertEquals(metrics.timings.max, 200);
        assertEquals(metrics.endpoints["test"].type.success, 2);
    });

    it("should record and report API metrics", () => {
        collector = new MetricsCollector({ scopes: { router: false, api: true }, window: 1000 });
        collector.recordAPICall("get", 50, "success");

        const metrics = collector.api as any;
        assertEquals(metrics.timings.requests, 1);
        assertEquals(metrics.methods["get"].results.success, 1);
    });

    it("should prune old data", () => {
        time = new FakeTime();
        collector = new MetricsCollector({ scopes: { router: true, api: true }, window: 1000 });
        
        collector.recordEndpoint("test", 100, "success");
        time.tick(1100); // Expire
        
        const metrics = collector.router as any;
        // Pruning happens on access or interval. Access triggers prune.
        // If all data is pruned, it returns empty object.
        assertEquals(Object.keys(metrics).length, 0);
    });
});
