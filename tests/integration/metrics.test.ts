import { describe, it } from "@std/testing/bdd";
import { assertEquals } from "@std/assert";
import { superoak } from "superoak";
import { crypto } from "@std/crypto";

import { buildApp } from "../../src/server.ts";
import { MetricsCollector } from "../../src/support/MetricsCollector.ts";
import { createDiscordRequest, api } from "./setup.ts";

describe("Metrics Integration", () => {
    it("should accurately track router endpoints and api methods end-to-end", async () => {
        const testKey = crypto.randomUUID();
        
        const metricsCollector = new MetricsCollector({
            window: 3600000,
            scopes: { api: true, router: true }
        });

        const app = buildApp({
            api,
            metricsCollector,
            config: {
                oembedProtocol: "https",
                redirectBase: "https://mock.aidungeon.com",
                metricsKey: testKey
            }
        });
        const abortController = new AbortController();

        try {
            // Fire a standard scenario request to trigger telemetry gathering
            const request = await superoak(app);
            await createDiscordRequest(request.get("/scenario/found-published/test-tail")).expect(200);

            // Fetch metrics using custom key to validate
            const metricsRequest = await superoak(app);
            const res = await metricsRequest.get(`/metrics?key=${testKey}`).expect(200);

            const metricsData = JSON.parse(res.text);

            // Assert Router Captured the Endpoint accurately
            assertEquals(
                metricsData.router.endpoints["scenario"].type["success"],
                1, 
                "Router should have exactly 1 successful scenario endpoint invocation"
            );

            // Assert API Captured the GraphQL Method accurately
            assertEquals(
                metricsData.api.methods["scenario_embed"].results["success"],
                1,
                "API should have exactly 1 successful scenario_embed method invocation"
            );

            // Assert invalid key returns 401
            const invalidRequest = await superoak(app);
            await invalidRequest.get(`/metrics?key=invalid-key`).expect(401);
            
            // Re-fetch to ensure the 401 error incremented for type "error" and to capture the first valid call
            const finalRequest = await superoak(app);
            const finalRes = await finalRequest.get(`/metrics?key=${testKey}`).expect(200);
            
            const finalData = JSON.parse(finalRes.text);
            
            // Verify Metrics endpoint tracks itself too (from the first valid request)
            assertEquals(
                finalData.router.endpoints["metrics"].type["success"],
                1,
                "Metrics query counts its own previous execution"
            );
            
            assertEquals(
                finalData.router.endpoints["metrics"].type["error"],
                1,
                "Metrics endpoint should increment error on invalid key rejection"
            );
        } finally {
            abortController.abort();
            metricsCollector?.cleanup();
        }
    });
});
