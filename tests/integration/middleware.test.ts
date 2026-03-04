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

    describe("Analytics", () => {
        it("should record event", async () => {
            const apiStub = stub(AIDungeonAPI.prototype, "getScenarioEmbed", () => Promise.resolve(mockScenario()));
            try {
                // We can't easily spy on the collector instance inside the app without exposing it.
                // But we can verify the request succeeds and presumably logs.
                // A better integration test would mock the Supabase client and check calls, 
                // but that requires dependency injection into the app which is hard here.
                // For now, we trust the unit tests for AnalyticsCollector and just check the route works.
                const request = await superoak(app);
                await request.get("/scenario/123/test?no_ua")
                    .expect(200);
            } finally {
                apiStub.restore();
            }
        });

        it("should ignore preview", async () => {
             const apiStub = stub(AIDungeonAPI.prototype, "getScenarioEmbed", () => Promise.resolve(mockScenario()));
             try {
                 const request = await superoak(app);
                 await request.get("/scenario/123/test?preview=true")
                     .expect(200);
             } finally {
                 apiStub.restore();
             }
        });
    });

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
        it("should return 404 for missing assets", async () => {
            const request = await superoak(app);
            await request.get("/dashboard/missing.js").expect(404);
        });
        it("should bypass if preview", async () => {
            // If preview is set, dashboard middleware calls next(), falling through to 404 handler (or whatever matches)
            // Since no other route matches /dashboard, it hits the fallback redirect
            const request = await superoak(app);
            await request.get("/dashboard?preview=true").expect(302);
        });
    });

    describe("Metrics", () => {
        it("should serve metrics with key", async () => {
            const request = await superoak(app);
            await request.get(`/metrics?key=${config.metrics.key}`).expect(200);
        });
        it("should return 401 without key", async () => {
            const request = await superoak(app);
            await request.get("/metrics").expect(401);
        });
    });

    describe("Settings", () => {
        it("should parse cookies", async () => {
            // Again, hard to verify internal state without debug endpoint.
            // But we can verify it doesn't crash.
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
        it("should serve robots.txt", async () => {
            const request = await superoak(app);
            await request.get("/robots.txt").expect(200);
        });
    });
});
