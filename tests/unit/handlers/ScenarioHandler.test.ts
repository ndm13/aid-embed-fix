import { assertEquals, assertExists } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import { FakeTime } from "@std/testing/time";
import { Context } from "@oak/oak";
import { createMockContext } from "@oak/oak/testing";
import { Environment, Template } from "npm:nunjucks";

import { AIDungeonAPI } from "@/src/api/AIDungeonAPI.ts";
import { AIDungeonAPIError } from "@/src/api/AIDungeonAPIError.ts";
import { ScenarioHandler } from "@/src/handlers/ScenarioHandler.ts";
import { RelatedLinks } from "@/src/support/RelatedLinks.ts";
import { AppState } from "@/src/types/AppState.ts";
import { ScenarioEmbedData } from "@/src/types/EmbedDataTypes.ts";

class MockTemplate {
    render(context: object): string {
        return JSON.stringify(context);
    }
}

class MockEnvironment {
    getTemplate(_name: string): Template {
        return new MockTemplate() as unknown as Template;
    }
}

function createTestContext(
    state: Partial<AppState>,
    params: Record<string, string>,
    url: URL,
    userAgent = "Discordbot/2.0"
) {
    const context = createMockContext({
        state: {
            metrics: {
                router: {
                    endpoint: "",
                    type: ""
                }
            },
            analytics: {
                timestamp: Date.now(),
                content: {
                    status: "unknown"
                }
            },
            ...state
        },
        params
    });
    // @ts-ignore: read-only property
    context.request.url = url;
    context.state.links = new RelatedLinks(context as unknown as Context<AppState>, {
        oembedProtocol: "https",
        defaultRedirectBase: "https://aid.com"
    });
    // @ts-ignore: userAgent is not on the mock type but is used by the handler
    context.request.userAgent = {
        ua: userAgent
    };
    return context;
}

describe("ScenarioHandler", () => {
    const env = new MockEnvironment() as unknown as Environment;
    const mockScenarioData: ScenarioEmbedData = {
        title: "Test Scenario",
        description: "A test scenario.",
        prompt: "This is a prompt.",
        image: "https://example.com/image.jpg",
        user: {
            isMember: false,
            profile: {
                title: "Test User",
                thumbImageUrl: "https://example.com/thumb.jpg"
            }
        }
    } as ScenarioEmbedData;

    it("should render a scenario", async () => {
        const handler = new ScenarioHandler(env);
        const context = createTestContext({
            api: {
                getScenarioEmbed: () => Promise.resolve(mockScenarioData)
            } as unknown as AIDungeonAPI
        }, {
            id: "test-scenario"
        }, new URL("https://example.com/scenario/test-scenario"));

        await handler.handle(context as unknown as Context<AppState>);

        assertExists(context.response.body);
        const responseBody = JSON.parse(context.response.body as string);

        assertEquals(responseBody.title, "Test Scenario");
        assertEquals(responseBody.author, "Test User");
        assertEquals(responseBody.description, "A test scenario.");
        assertEquals(responseBody.cover, "https://example.com/image.jpg");
    });

    it("should handle invalid image URLs gracefully", async () => {
        const handler = new ScenarioHandler(env);
        const scenarioWithInvalidImage: ScenarioEmbedData = {
            ...mockScenarioData,
            image: "not-a-valid-url"
        };
        const context = createTestContext({
            api: {
                getScenarioEmbed: () => Promise.resolve(scenarioWithInvalidImage)
            } as unknown as AIDungeonAPI
        }, {
            id: "test-scenario"
        }, new URL("https://example.com/scenario/test-scenario"));

        await handler.handle(context as unknown as Context<AppState>);

        assertExists(context.response.body);
        const responseBody = JSON.parse(context.response.body as string);

        assertEquals(responseBody.cover, "not-a-valid-url");
    });

    describe("description logic", () => {
        const handler = new ScenarioHandler(env);

        it("should use description when available", async () => {
            const context = createTestContext(
                {
                    api: {
                        getScenarioEmbed: () => Promise.resolve(mockScenarioData)
                    } as unknown as AIDungeonAPI
                },
                { id: "test-scenario" },
                new URL("https://example.com/scenario/test-scenario")
            );

            await handler.handle(context as unknown as Context<AppState>);
            const responseBody = JSON.parse(context.response.body as string);
            assertEquals(responseBody.description, "A test scenario.");
        });

        it("should use prompt when description is undefined", async () => {
            const scenarioWithoutDescription: ScenarioEmbedData = {
                ...mockScenarioData,
                description: null
            };
            const context = createTestContext(
                {
                    api: {
                        getScenarioEmbed: () => Promise.resolve(scenarioWithoutDescription)
                    } as unknown as AIDungeonAPI
                },
                { id: "test-scenario" },
                new URL("https://example.com/scenario/test-scenario")
            );

            await handler.handle(context as unknown as Context<AppState>);
            const responseBody = JSON.parse(context.response.body as string);
            assertEquals(responseBody.description, "This is a prompt.");
        });

        it("should use empty string when both description and prompt are undefined", async () => {
            const scenarioWithoutDescriptionOrPrompt: ScenarioEmbedData = {
                ...mockScenarioData,
                description: null,
                prompt: null
            };
            const context = createTestContext(
                {
                    api: {
                        getScenarioEmbed: () => Promise.resolve(scenarioWithoutDescriptionOrPrompt)
                    } as unknown as AIDungeonAPI
                },
                { id: "test-scenario" },
                new URL("https://example.com/scenario/test-scenario")
            );

            await handler.handle(context as unknown as Context<AppState>);
            const responseBody = JSON.parse(context.response.body as string);
            assertEquals(responseBody.description, "");
        });
    });

    it("should render an error page if the scenario is not found", async () => {
        const handler = new ScenarioHandler(env);
        const context = createTestContext({
            api: {
                getScenarioEmbed: () => Promise.reject(new Error("Scenario not found"))
            } as unknown as AIDungeonAPI
        }, {
            id: "nonexistent-scenario"
        }, new URL("https://example.com/scenario/nonexistent-scenario"));

        await handler.handle(context as unknown as Context<AppState>);

        assertExists(context.response.body);
        const responseBody = JSON.parse(context.response.body as string);

        assertEquals(responseBody.type, "scenario");
        assertEquals(responseBody.id, "nonexistent-scenario");
    });

    describe("analytics", () => {
        it("should report visibility for published scenarios", async () => {
            const handler = new ScenarioHandler(env);
            const mockScenarioData: ScenarioEmbedData = {
                title: "Test Scenario",
                unlisted: false, // published
                user: { profile: { title: "Test User" } }
            } as ScenarioEmbedData;

            const context = createTestContext({
                api: {
                    getScenarioEmbed: () => Promise.resolve(mockScenarioData)
                } as unknown as AIDungeonAPI
            }, {
                id: "test-scenario"
            }, new URL("https://example.com/scenario/test-scenario"));

            await handler.handle(context as unknown as Context<AppState>);

            assertEquals(context.state.analytics.content?.visibility, "Published");
        });

        it("should report visibility for unlisted scenarios", async () => {
            const handler = new ScenarioHandler(env);
            const mockScenarioData: ScenarioEmbedData = {
                title: "Test Scenario",
                unlisted: true, // unlisted
                user: { profile: { title: "Test User" } }
            } as ScenarioEmbedData;

            const context = createTestContext({
                api: {
                    getScenarioEmbed: () => Promise.resolve(mockScenarioData)
                } as unknown as AIDungeonAPI
            }, {
                id: "test-scenario"
            }, new URL("https://example.com/scenario/test-scenario"));

            await handler.handle(context as unknown as Context<AppState>);

            assertEquals(context.state.analytics.content?.visibility, "Unlisted");
        });

        it("should record duration on success", async () => {
            using time = new FakeTime();
            const handler = new ScenarioHandler(env);
            const context = createTestContext({
                api: {
                    getScenarioEmbed: async () => {
                        await time.tickAsync(75);
                        return mockScenarioData;
                    }
                } as unknown as AIDungeonAPI
            }, {
                id: "test-scenario"
            }, new URL("https://example.com/scenario/test-scenario"));

            await handler.handle(context as unknown as Context<AppState>);

            assertEquals(context.state.analytics.content?.status, "success");
            assertEquals(context.state.metrics.api?.duration, 75);
        });

        it("should report api_error on API error", async () => {
            using time = new FakeTime();
            const handler = new ScenarioHandler(env);
            const context = createTestContext({
                api: {
                    getScenarioEmbed: async () => {
                        await time.tickAsync(50);
                        throw AIDungeonAPIError.onUnpack("test", {} as any, { data: {} });
                    }
                } as unknown as AIDungeonAPI
            }, {
                id: "test-scenario"
            }, new URL("https://example.com/scenario/test-scenario"));

            await handler.handle(context as unknown as Context<AppState>);

            assertEquals(context.state.analytics.content?.status, "api_error");
            assertEquals(context.state.metrics.api?.duration, 50);
        });

        it("should report net_error on network error", async () => {
            using time = new FakeTime();
            const handler = new ScenarioHandler(env);
            const context = createTestContext({
                api: {
                    getScenarioEmbed: async () => {
                        await time.tickAsync(100);
                        throw AIDungeonAPIError.onRequest("test", {} as any, new Error("network error"));
                    }
                } as unknown as AIDungeonAPI
            }, {
                id: "test-scenario"
            }, new URL("https://example.com/scenario/test-scenario"));

            await handler.handle(context as unknown as Context<AppState>);

            assertEquals(context.state.analytics.content?.status, "net_error");
            assertEquals(context.state.metrics.api?.duration, 100);
        });
    });
});
