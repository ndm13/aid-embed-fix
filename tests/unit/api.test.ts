import { describe, it } from "@std/testing/bdd";
import { assertEquals, assertRejects } from "@std/assert";
import { FakeTime } from "@std/testing/time";
import { AIDungeonAPI } from "../../src/api/AIDungeonAPI.ts";
import defaultConfig from "../../src/config.ts";

describe("AIDungeonAPI Unit Tests", () => {
    it("should natively attempt to refresh the token when less than 5 minutes remain", async () => {
        let refreshCalled = false;
        const originalFetch = globalThis.fetch;
        globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
            const urlStr = input instanceof Request ? input.url : input.toString();
            // First boot guest login
            if (urlStr.includes("accounts:signUp")) {
                return new Response(JSON.stringify({
                    idToken: "initial-token",
                    refreshToken: "initial-refresh",
                    expiresIn: "3600"
                }), { status: 200, headers: { "Content-Type": "application/json" } });
            }
            // Refresh logic
            if (urlStr.includes("securetoken.googleapis.com/v1/token")) {
                refreshCalled = true;
                return new Response(JSON.stringify({
                    id_token: "refreshed-token",
                    refresh_token: "refreshed-refresh",
                    expires_in: "3600"
                }), { status: 200, headers: { "Content-Type": "application/json" } });
            }
            return new Response(JSON.stringify({ data: { scenario: null } }), { status: 200, headers: { "Content-Type": "application/json" } });
        };

        const time = new FakeTime();
        try {
            const api = await AIDungeonAPI.create({
                gqlEndpoint: "https://mock.aidungeon.com/graphql",
                userAgent: "test",
                origin: "https://mock.aidungeon.com",
                firebase: defaultConfig.firebase
            });

            // 1 Hour is 3600000ms. Less than 5 mins is 3300000. Let's jump 56 minutes!
            time.tick(3360000); 

            // Make ANY graphql call to trigger the authorization verify check
            try {
                await api.getScenarioEmbed("test-id");
            } catch (e) {
                // Ignore the empty payload rejection
            }
            
            assertEquals(refreshCalled, true);
        } finally {
            time.restore();
            globalThis.fetch = originalFetch;
        }
    });

    it("should gracefully mint a brand new guest token if completely expired", async () => {
        let signUpCalled = false;
        const originalFetch = globalThis.fetch;
        globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
            const urlStr = input instanceof Request ? input.url : input.toString();
            if (urlStr.includes("accounts:signUp")) {
                signUpCalled = true;
                return new Response(JSON.stringify({
                    idToken: "newest-token",
                    refreshToken: "newest-refresh",
                    expiresIn: "3600"
                }), { status: 200, headers: { "Content-Type": "application/json" } });
            }
            return new Response(JSON.stringify({ data: { scenario: null } }), { status: 200, headers: { "Content-Type": "application/json" } });
        };

        // We bypass 'create' slightly to inject an already expired setup natively by instantiating directly via constructor (private, but accessible if we spoof it, or just time leap again!)
        const time = new FakeTime();
        try {
            const api = await AIDungeonAPI.create({
                gqlEndpoint: "https://mock.aidungeon.com/graphql",
                userAgent: "test",
                origin: "https://mock.aidungeon.com",
                firebase: defaultConfig.firebase
            });

            // Reset signal from the boot
            signUpCalled = false;

            // Jump past the 60 minutes limit directly to 2 hours!
            time.tick(7200000);

            // Fetch to trigger token validation branch `this.isExpired`
            try {
                await api.getScenarioEmbed("test-id");
            } catch (e) {
                // Ignore empty payload rejection
            }

            assertEquals(signUpCalled, true);
        } finally {
            time.restore();
            globalThis.fetch = originalFetch;
        }
    });

    it("should throw if an existing user token expires completely and it expects non-guest access", async () => {
        const originalFetch = globalThis.fetch;
        globalThis.fetch = async () => {
            return new Response(JSON.stringify({ data: { scenario: null } }), { status: 200, headers: { "Content-Type": "application/json" } });
        };

        const time = new FakeTime();
        try {
            // Using credentials blocks `guest` mode flag
            const api = await AIDungeonAPI.create({
                gqlEndpoint: "https://mock.aidungeon.com/graphql",
                userAgent: "test",
                origin: "https://mock.aidungeon.com",
                firebase: defaultConfig.firebase
            }, { kind: "identityToolkit#VerifyPasswordResponse", localId: "user-123", idToken: "user-token", refreshToken: "user-refresh", expiresIn: "3600" }, Date.now());

            // Ensure our fake time triggers full expiration (Assuming max token was theoretically 1 hour behind)
            // Wait, generated defaults to Date.now() when `create` runs.
            time.tick(7200000);

            await assertRejects(
                async () => await api.getScenarioEmbed("test-id"),
                Error,
                "Error refreshing token"
            );
        } finally {
            time.restore();
            globalThis.fetch = originalFetch;
        }
    });

    it("should map GraphQL errors during network fallback and catch safely", async () => {
        const originalFetch = globalThis.fetch;
        globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
            const urlStr = input instanceof Request ? input.url : input.toString();
            // First boot guest login
            if (urlStr.includes("accounts:signUp")) {
                return new Response(JSON.stringify({ idToken: "tk", refreshToken: "rf", expiresIn: "3600" }));
            }
            if (urlStr.includes("graphql")) {
                // Return an error format that triggers throwing AidungeonAPIError parsing in formatters
                return new Response(JSON.stringify({
                    errors: [{ message: "Network graph collapse", extensions: {} }]
                }), { status: 200 });
            }
            throw new Error("Unhandled route");
        };

        const time = new FakeTime();
        try {
            const api = await AIDungeonAPI.create({
                gqlEndpoint: "https://mock.aidungeon.com/graphql",
                userAgent: "test",
                origin: "https://mock.aidungeon.com",
                firebase: defaultConfig.firebase
            });

            await assertRejects(
                async () => await api.getScenarioEmbed("err-id"),
                Error,
                "Couldn't find scenario with id err-id"
            );
        } finally {
            time.restore();
            globalThis.fetch = originalFetch;
        }
    });
});
