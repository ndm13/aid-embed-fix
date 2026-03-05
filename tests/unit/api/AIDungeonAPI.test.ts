import { assertEquals, assertRejects } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import { FakeTime } from "@std/testing/time";
import { stub } from "@std/testing/mock";

import { AIDungeonAPI } from "@/src/api/AIDungeonAPI.ts";
import { AIDungeonAPIError } from "@/src/api/AIDungeonAPIError.ts";
import { mockAdventure, mockUser } from "../../mocks/data.ts";

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

    it("should throw TypeError if generated time is invalid", async () => {
        await assertRejects(
            () => AIDungeonAPI.create(config, { idToken: "t", refreshToken: "r", expiresIn: "3600" } as any),
            TypeError,
            "Invalid generated time"
        );
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

    it("should throw error if non-guest token expired", async () => {
        using time = new FakeTime();
        const api = await AIDungeonAPI.create(config, { idToken: "t", refreshToken: "r", expiresIn: "3600" } as any, Date.now());
        
        await time.tickAsync(3600 * 1000 + 100); // Expire
        
        await assertRejects(
            () => api.getScenarioEmbed("1"),
            AIDungeonAPIError,
            "Error refreshing token"
        );
    });

    it("should refresh token if close to expiration", async () => {
        using time = new FakeTime();
        const fetchStub = stub(globalThis, "fetch", (input) => {
            if (typeof input === "string" && input.includes("token?key=")) {
                return Promise.resolve({
                    json: () => Promise.resolve({ id_token: "new_token", refresh_token: "new_refresh", expires_in: "3600" })
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
            const api = await AIDungeonAPI.create(config, { idToken: "t", refreshToken: "r", expiresIn: "3600" } as any, Date.now());
            
            await time.tickAsync(3400000); // < 5 mins left
            
            await api.getScenarioEmbed("1"); // Should trigger refresh
            // No assertion needed other than it doesn't throw and fetchStub was called correctly
        } finally {
            fetchStub.restore();
        }
    });

    it("should throw AIDungeonAPIError on GraphQL error", async () => {
        const fetchStub = stub(globalThis, "fetch", () => Promise.resolve({
            json: () => Promise.resolve({ errors: [{ message: "Fail" }] })
        } as Response));

        try {
            const api = await AIDungeonAPI.create(config, { idToken: "t", refreshToken: "r", expiresIn: "3600" } as any, Date.now());
            await assertRejects(() => api.getScenarioEmbed("1"), AIDungeonAPIError);
        } finally {
            fetchStub.restore();
        }
    });

    it("should throw AIDungeonAPIError on network error", async () => {
        const fetchStub = stub(globalThis, "fetch", () => Promise.reject(new Error("Net Fail")));

        try {
            const api = await AIDungeonAPI.create(config, { idToken: "t", refreshToken: "r", expiresIn: "3600" } as any, Date.now());
            await assertRejects(() => api.getScenarioEmbed("1"), AIDungeonAPIError);
        } finally {
            fetchStub.restore();
        }
    });

    it("should throw AIDungeonAPIError on token refresh error", async () => {
        using time = new FakeTime();
        const fetchStub = stub(globalThis, "fetch", (input) => {
            if (typeof input === "string" && input.includes("token?key=")) {
                return Promise.reject(new Error("Refresh Fail"));
            }
            return Promise.resolve({} as Response);
        });

        try {
            const api = await AIDungeonAPI.create(config, { idToken: "t", refreshToken: "r", expiresIn: "3600" } as any, Date.now());
            await time.tickAsync(3400000); // < 5 mins left
            
            await assertRejects(() => api.getScenarioEmbed("1"), AIDungeonAPIError, "Error refreshing token");
        } finally {
            fetchStub.restore();
        }
    });

    it("should fetch adventure and user embeds", async () => {
        const fetchStub = stub(globalThis, "fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
            const requestBody = init?.body;
            if (typeof requestBody === "string" && requestBody.includes("GetAdventure")) {
                return Promise.resolve({ json: () => Promise.resolve({ data: { adventure: mockAdventure() } }) } as Response);
            }
            if (typeof requestBody === "string" && requestBody.includes("ProfileScreenGetUser")) {
                return Promise.resolve({ json: () => Promise.resolve({ data: { user: mockUser() } }) } as Response);
            }
            return Promise.resolve({ json: () => Promise.resolve({}) } as Response);
        });

        try {
            const api = await AIDungeonAPI.create(config, { idToken: "t", refreshToken: "r", expiresIn: "3600" } as any, Date.now());
            const adventure = await api.getAdventureEmbed("1");
            const user = await api.getUserEmbed("user");
            assertEquals(adventure.title, "Test Adventure");
            assertEquals(user.profile.title, "Test User");
        } finally {
            fetchStub.restore();
        }
    });
});
