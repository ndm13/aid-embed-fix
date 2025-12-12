import { assertEquals, assertExists } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import { createMockContext } from "@oak/oak/testing";
import { Environment, Template } from "npm:nunjucks";
import { ScenarioHandler } from "@/src/handlers/ScenarioHandler.ts";
import { AppState } from "@/src/types/AppState.ts";
import { ScenarioEmbedData } from "@/src/types/EmbedDataTypes.ts";
import { RelatedLinks } from "@/src/support/RelatedLinks.ts";
import { Context } from "@oak/oak";
import { AIDungeonAPI } from "@/src/api/AIDungeonAPI.ts";

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
        assertEquals(
            responseBody.oembed,
            "https://example.com/oembed.json?title=Test+Scenario&author=Test+User&type=Scenario"
        );
    });

    it("should handle UUID image paths", async () => {
        const handler = new ScenarioHandler(env);
        const scenarioWithUuidImage: ScenarioEmbedData = {
            ...mockScenarioData,
            image: "https://images.prod.another-dungeon.com/00000000-0000-0000-0000-000000000000"
        };
        const context = createTestContext({
            api: {
                getScenarioEmbed: () => Promise.resolve(scenarioWithUuidImage)
            } as unknown as AIDungeonAPI
        }, {
            id: "test-scenario"
        }, new URL("https://example.com/scenario/test-scenario"));

        await handler.handle(context as unknown as Context<AppState>);

        assertExists(context.response.body);
        const responseBody = JSON.parse(context.response.body as string);

        assertEquals(
            responseBody.cover,
            "https://images.prod.another-dungeon.com/00000000-0000-0000-0000-000000000000/public"
        );
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

    it("should use better image parameter", async () => {
        const handler = new ScenarioHandler(env);
        const url = new URL("https://example.com/scenario/test-scenario");
        url.searchParams.set("bi", "https://better.image/image.png");
        const context = createTestContext({
            api: {
                getScenarioEmbed: () => Promise.resolve(mockScenarioData)
            } as unknown as AIDungeonAPI
        }, {
            id: "test-scenario"
        }, url);

        await handler.handle(context as unknown as Context<AppState>);

        assertExists(context.response.body);
        const responseBody = JSON.parse(context.response.body as string);

        assertEquals(responseBody.cover, "https://better.image/image.png");
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

    describe("redirects", () => {
        const handler = new ScenarioHandler(env);

        const testRedirect = async (requestUrl: string, expectedRedirect: string) => {
            const context = createTestContext(
                { api: { getScenarioEmbed: () => Promise.resolve(mockScenarioData) } as unknown as AIDungeonAPI },
                { id: "test-scenario" },
                new URL(requestUrl),
                "Mozilla/5.0"
            );

            let redirectedUrl = "";
            context.response.redirect = ((url: string | URL) => {
                redirectedUrl = url.toString();
            }) as any;

            await handler.handle(context as unknown as Context<AppState>);

            assertEquals(context.response.status, 301);
            assertEquals(redirectedUrl, expectedRedirect);
        };

        it("should redirect non-Discord user agents to default", () =>
            testRedirect(
                "https://example.com/scenario/test-scenario",
                "https://aid.com/scenario/test-scenario"
            ));

        it("should redirect to play.aidungeon.com for play. subdomain", () =>
            testRedirect(
                "https://play.example.com/scenario/test-scenario",
                "https://play.aidungeon.com/scenario/test-scenario"
            ));

        it("should redirect to beta.aidungeon.com for beta. subdomain", () =>
            testRedirect(
                "https://beta.example.com/scenario/test-scenario",
                "https://beta.aidungeon.com/scenario/test-scenario"
            ));

        it("should redirect to alpha.aidungeon.com for alpha. subdomain", () =>
            testRedirect(
                "https://alpha.example.com/scenario/test-scenario",
                "https://alpha.aidungeon.com/scenario/test-scenario"
            ));

        it("should pass through redirect keys", async () => {
            const url = new URL("https://example.com/scenario/test-scenario");
            url.searchParams.set("share", "true");
            url.searchParams.set("source", "test");
            const context = createTestContext(
                {
                    api: {
                        getScenarioEmbed: () => Promise.resolve(mockScenarioData)
                    } as unknown as AIDungeonAPI
                },
                {
                    id: "test-scenario"
                },
                url,
                "Mozilla/5.0"
            );

            let redirectedUrl = "";
            context.response.redirect = ((url: string | URL) => {
                redirectedUrl = url.toString();
            }) as any;

            await handler.handle(context as unknown as Context<AppState>);

            assertEquals(redirectedUrl, "https://aid.com/scenario/test-scenario?share=true&source=test");
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
});
