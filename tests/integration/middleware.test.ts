import { superoak } from "superoak";
import { afterAll, describe, it } from "@std/testing/bdd";
import { stub } from "@std/testing/mock";
import { AIDungeonAPI } from "@/src/api/AIDungeonAPI.ts";
import { AnalyticsCollector } from "@/src/support/AnalyticsCollector.ts";
import { mockScenario } from "../mocks/data.ts";
import config from "@/src/config.ts";

// Stub testSecret before app init
const testSecretStub = stub(AnalyticsCollector.prototype, "testSecret" as any, () => Promise.resolve());
const { app } = await import("@/src/server.ts");

describe("Middleware Integration", () => {
    afterAll(() => {
        testSecretStub.restore();
    });

    // describe("Analytics Middleware", () => {
    //     it("should call collector.record for normal requests", async () => {
    //         const apiStub = stub(AIDungeonAPI.prototype, "getScenarioEmbed", () => Promise.resolve(mockScenario()));
    //         const collector = new AnalyticsCollector({} as any, {} as any);
    //         const recordSpy = spy(collector, "record");
            
    //         try {
    //             const request = await superoak(app);
    //             await request.get("/scenario/123/test?no_ua")
    //                 .expect(200);
    //             assertSpyCalls(recordSpy, 1);
    //         } finally {
    //             apiStub.restore();
    //         }
    //     });

    //     it("should NOT call collector.record for preview requests", async () => {
    //         const apiStub = stub(AIDungeonAPI.prototype, "getScenarioEmbed", () => Promise.resolve(mockScenario()));
    //         try {
    //             const request = await superoak(app);
    //             await request.get("/scenario/123/test?preview=true")
    //                 .expect(200);
    //         } finally {
    //             apiStub.restore();
    //         }
    //     });
    // });

    describe("Other Middleware", () => {
        describe("Blocklist", () => {
            it("should block PHP", async () => {
                const request = await superoak(app);
                await request.get("/index.php").expect(404);
            });
            it("should block dotfiles", async () => {
                const request = await superoak(app);
                await request.get("/.env").expect(404);
            });
            it("should allow valid paths", async () => {
                const request = await superoak(app);
                await request.get("/style.css").expect(200);
            });
        });

        describe("Dashboard", () => {
            it("should redirect root", async () => {
                const request = await superoak(app);
                await request.get("/dashboard").expect(302).expect("Location", "/dashboard/");
            });
        });

        describe("Metrics", () => {
            it("should serve metrics with key", async () => {
                const request = await superoak(app);
                await request.get(`/metrics?key=${config.metrics.key}`).expect(200);
            });
        });

        describe("Settings", () => {
            it("should parse cookies", async () => {
                const request = await superoak(app);
                await request.get("/healthcheck")
                    .set("Cookie", "link_settings=%7B%22env%22%3A%22beta%22%7D")
                    .expect(200);
            });
        });

        describe("Statics", () => {
            it("should serve healthcheck", async () => {
                const request = await superoak(app);
                await request.get("/healthcheck").expect(200).expect("ok");
            });
        });
    });
});
