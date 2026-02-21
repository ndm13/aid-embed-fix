import { assertEquals, assertExists, assertRejects } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import { stub } from "@std/testing/mock";
import { FakeTime } from "@std/testing/time";
import { AIDungeonAPI, AIDungeonAPIConfig } from "@/src/api/AIDungeonAPI.ts";
import { GraphQLQuery, IdentityKitCredentials } from "@/src/types/AIDungeonAPITypes.ts";
import { AdventureEmbedData, ScenarioEmbedData, UserEmbedData } from "@/src/types/EmbedDataTypes.ts";

const config: AIDungeonAPIConfig = {
    gqlEndpoint: "https://api.aidungeon.com/graphql",
    userAgent: "test-agent",
    origin: "https://play.aidungeon.com",
    firebase: {
        identityToolkitKey: "test-firebase-key",
        clientToken: "test-client-token",
        clientVersion: "test-client-version"
    }
};

const mockCredentials = (expiresIn: number): IdentityKitCredentials => ({
    kind: "test",
    localId: "test",
    idToken: "test-id-token",
    refreshToken: "test-refresh-token",
    expiresIn: expiresIn.toString()
});

describe("AIDungeonAPI", () => {
    describe("create", () => {
        it("should create a guest session if no credentials are provided", async () => {
            const credentials = mockCredentials(3600);
            using fetchMock = stub(globalThis, "fetch", () => Promise.resolve(new Response(JSON.stringify(credentials))));

            const api = await AIDungeonAPI.create(config);

            assertExists(api);
            assertEquals(api.isExpired, false);
            assertEquals(fetchMock.calls.length, 1);
            assertEquals(
                fetchMock.calls[0].args[0],
                `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${config.firebase.identityToolkitKey}`
            );
        });

        it("should use existing credentials if provided", async () => {
            using fetchMock = stub(globalThis, "fetch", () => Promise.reject(new Error("fetch should not be called")));
            const api = await AIDungeonAPI.create(config, mockCredentials(3600), Date.now());

            assertExists(api);
            assertEquals(api.isExpired, false);
            assertEquals(fetchMock.calls.length, 0);
        });

        it("should throw an error if credentials are provided without a generation time", async () => {
            await assertRejects(
                () => AIDungeonAPI.create(config, mockCredentials(3600)),
                "Invalid generated time"
            );
        });
    });

    describe("query", () => {
        it("should make a GraphQL query", async () => {
            using fetchMock = stub(
                globalThis,
                "fetch",
                () => Promise.resolve(new Response(JSON.stringify({ data: { success: true } })))
            );
            const api = await AIDungeonAPI.create(config, mockCredentials(3600), Date.now());

            const query: GraphQLQuery = { operationName: "test", query: "{ test }", variables: {} };
            const response = await api.query<any>(query);

            assertEquals(response.data, { success: true });
            assertEquals(fetchMock.calls.length, 1);
            assertEquals(fetchMock.calls[0].args[0], config.gqlEndpoint);
        });

        it("should throw an error on network failure", async () => {
            // @ts-ignore: no-unused-vars
            using _ = stub(globalThis, "fetch", () => Promise.reject(new Error("Network error")));
            const api = await AIDungeonAPI.create(config, mockCredentials(3600), Date.now());

            await assertRejects(
                () => api.query({ operationName: "test", query: "{ test }", variables: {} }),
                "Error running GraphQL query"
            );
        });
    });

    describe("token management", () => {
        it("should refresh an expiring token", async () => {
            using time = new FakeTime();
            const refreshedCreds = { ...mockCredentials(3600), id_token: "new-id-token" };
            using fetchMock = stub(globalThis, "fetch", (url: string | URL | Request) => {
                if (url.toString().startsWith("https://securetoken.googleapis.com/")) {
                    return Promise.resolve(new Response(JSON.stringify(refreshedCreds)));
                }
                return Promise.resolve(new Response(JSON.stringify({ data: {} })));
            });

            const api = await AIDungeonAPI.create(config, mockCredentials(300), Date.now());
            await time.tickAsync(1000); // Elapse 1 second, token is now close to expiry

            await api.query({ operationName: "test", query: "{ test }", variables: {} });
            assertEquals(fetchMock.calls.length, 2); // 1 for refresh, 1 for query
        });

        it("should get a new token for an expired guest session", async () => {
            using time = new FakeTime();
            const newCreds = { ...mockCredentials(3600), idToken: "new-guest-token" };
            const fetchMock = stub(globalThis, "fetch", () => Promise.resolve(new Response(JSON.stringify(newCreds))));

            const api = await AIDungeonAPI.create(config);
            fetchMock.calls.splice(0); // Clear initial create call

            await time.tickAsync(3601 * 1000); // Expire the token
            await api.query({ operationName: "test", query: "{ test }", variables: {} });

            assertEquals(fetchMock.calls.length, 2); // 1 for new token, 1 for query
        });

        it("should throw an error for an expired non-guest session", async () => {
            using time = new FakeTime();
            const api = await AIDungeonAPI.create(config, mockCredentials(1), Date.now());
            await time.tickAsync(2000); // Expire the token

            await assertRejects(
                () => api.query({ operationName: "test", query: "{ test }", variables: {} }),
                "Non-guest API token expired"
            );
        });
    });

    describe("embed methods", () => {
        it("getScenarioEmbed should call query and unpack data", async () => {
            const api = await AIDungeonAPI.create(config, mockCredentials(3600), Date.now());
            const mockData = { title: "Test" } as ScenarioEmbedData;
            using queryStub = stub(api, "query", () => Promise.resolve({ data: { scenario: mockData } }));

            const result = await api.getScenarioEmbed("test-id", true);
            assertEquals(result, mockData);
            assertEquals(queryStub.calls.length, 1);
            assertEquals(queryStub.calls[0].args[0].operationName, "GetScenario");
            assertEquals(queryStub.calls[0].args[0].variables, { shortId: "test-id", viewPublished: true });
        });

        it("getAdventureEmbed should call query and unpack data", async () => {
            const api = await AIDungeonAPI.create(config, mockCredentials(3600), Date.now());
            const mockData = { title: "Test" } as AdventureEmbedData;
            using queryStub = stub(api, "query", () => Promise.resolve({ data: { adventure: mockData } }));

            const result = await api.getAdventureEmbed("test-id");
            assertEquals(result, mockData);
            assertEquals(queryStub.calls.length, 1);
            assertEquals(queryStub.calls[0].args[0].operationName, "GetAdventure");
            assertEquals(queryStub.calls[0].args[0].variables, { shortId: "test-id" });
        });

        it("getUserEmbed should call query and unpack data", async () => {
            const api = await AIDungeonAPI.create(config, mockCredentials(3600), Date.now());
            const mockData = { profile: { title: "Test" } } as UserEmbedData;
            using queryStub = stub(api, "query", () => Promise.resolve({ data: { user: mockData } }));

            const result = await api.getUserEmbed("test-user");
            assertEquals(result, mockData);
            assertEquals(queryStub.calls.length, 1);
            assertEquals(queryStub.calls[0].args[0].operationName, "ProfileScreenGetUser");
            assertEquals(queryStub.calls[0].args[0].variables, { username: "test-user" });
        });

        it("should throw error if embed data is missing", async () => {
            const api = await AIDungeonAPI.create(config, mockCredentials(3600), Date.now());
            // @ts-ignore: no-unused-vars
            using _ = stub(api, "query", () => Promise.resolve({ data: {} }));

            await assertRejects(
                () => api.getScenarioEmbed("test-id", false),
                "Couldn't find scenario with id test-id"
            );
        });
    });
});
