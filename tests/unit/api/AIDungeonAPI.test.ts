import { assertEquals, assertRejects } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import { FakeTime } from "@std/testing/time";
import { stub } from "@std/testing/mock";

import { AIDungeonAPI } from "@/src/api/AIDungeonAPI.ts";
import { AIDungeonAPIError } from "@/src/api/AIDungeonAPIError.ts";

const config = {
    gqlEndpoint: "http://test/gql",
    userAgent: "test",
    origin: "http://test",
    firebase: { identityToolkitKey: "k", clientToken: "t", clientVersion: "v" }
};

describe("AIDungeonAPI", () => {
    it("should create guest and fetch token", async () => {
        const fetchStub = stub(globalThis, "fetch", () => Promise.resolve({
            json: () => Promise.resolve({ idToken: "token", refreshToken: "refresh", expiresIn: "3600" })
        } as Response));

        try {
            const api = await AIDungeonAPI.create(config);
            assertEquals(api.isExpired, false);
        } finally {
            fetchStub.restore();
        }
    });

    it("should refresh token if expired", async () => {
        using time = new FakeTime();
        const fetchStub = stub(globalThis, "fetch", (input) => {
            if (typeof input === "string" && input.includes("signUp")) {
                return Promise.resolve({
                    json: () => Promise.resolve({ idToken: "token", refreshToken: "refresh", expiresIn: "3600" })
                } as Response);
            }
            if (typeof input === "string" && input.includes("gql")) {
                return Promise.resolve({
                    json: () => Promise.resolve({ data: { scenario: { id: "1" } } })
                } as Response);
            }
            return Promise.resolve({} as Response);
        });

        try {
            const api = await AIDungeonAPI.create(config);
            await time.tickAsync(3600 * 1000 + 100); // Expire
            
            await api.getScenarioEmbed("1"); // Should trigger refresh (new guest)
            assertEquals(api.isExpired, false);
        } finally {
            fetchStub.restore();
        }
    });

    it("should throw AIDungeonAPIError on GraphQL error", async () => {
        const fetchStub = stub(globalThis, "fetch", () => Promise.resolve({
            json: () => Promise.resolve({ errors: [{ message: "Fail" }] })
        } as Response));

        try {
            // Bypass create fetch
            const api = await AIDungeonAPI.create(config, { idToken: "t", refreshToken: "r", expiresIn: "3600" } as any, Date.now());
            // @ts-ignore: testing error type
            await assertRejects(() => api.getScenarioEmbed("1"), AIDungeonAPIError);
        } finally {
            fetchStub.restore();
        }
    });

    it("should throw AIDungeonAPIError on network error", async () => {
        const fetchStub = stub(globalThis, "fetch", () => Promise.reject(new Error("Net Fail")));

        try {
            const api = await AIDungeonAPI.create(config, { idToken: "t", refreshToken: "r", expiresIn: "3600" } as any, Date.now());
            // @ts-ignore: testing error type
            await assertRejects(() => api.getScenarioEmbed("1"), AIDungeonAPIError);
        } finally {
            fetchStub.restore();
        }
    });
});
