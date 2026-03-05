import { describe, it } from "@std/testing/bdd";
import { assertSpyCalls, spy } from "@std/testing/mock";
import { middleware } from "@/src/middleware/analytics.ts";
import { AnalyticsCollector } from "@/src/support/AnalyticsCollector.ts";
import { createMockContext } from "../../mocks/context.ts";

describe("Analytics Middleware", () => {
    it("should record an event for a normal request", async () => {
        const collector = { record: spy() } as unknown as AnalyticsCollector;
        const mw = middleware(collector);
        const context = createMockContext();
        const next = () => Promise.resolve();

        await mw(context, next);

        assertSpyCalls(collector.record as any, 1);
    });

    it("should not record an event for a preview request", async () => {
        const collector = { record: spy() } as unknown as AnalyticsCollector;
        const mw = middleware(collector);
        const context = createMockContext({ query: { preview: "true" } });
        const next = () => Promise.resolve();

        await mw(context, next);

        assertSpyCalls(collector.record as any, 0);
    });
});
