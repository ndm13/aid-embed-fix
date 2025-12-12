import { assertEquals, assertExists } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import { createMockContext } from "@oak/oak/testing";
import { Environment, Template } from "npm:nunjucks";
import { AdventureHandler } from "@/src/handlers/AdventureHandler.ts";
import { AppState } from "@/src/types/AppState.ts";
import { AdventureEmbedData } from "@/src/types/EmbedDataTypes.ts";
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

function createTestContext(state: Partial<AppState>, params: Record<string, string>) {
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
    context.state.links = new RelatedLinks(context as unknown as Context<AppState>, {
        oembedProtocol: "https",
        defaultRedirectBase: "https://aid.com"
    });
    // @ts-ignore: userAgent is not on the mock type but is used by the handler
    context.request.userAgent = {
        ua: "Discordbot/2.0"
    };
    return context;
}

describe("AdventureHandler", () => {
    const env = new MockEnvironment() as unknown as Environment;

    it("should render an adventure", async () => {
        const handler = new AdventureHandler(env);
        const mockAdventureData: AdventureEmbedData = {
            title: "Test Adventure",
            description: "A test adventure.",
            image: "https://example.com/image.jpg",
            user: {
                isMember: false,
                profile: {
                    title: "Test User",
                    thumbImageUrl: "https://example.com/thumb.jpg"
                }
            }
        } as AdventureEmbedData;

        const context = createTestContext({
            api: {
                getAdventureEmbed: () => Promise.resolve(mockAdventureData)
            } as unknown as AIDungeonAPI
        }, {
            id: "test-adventure"
        });

        await handler.handle(context as unknown as Context<AppState>);

        assertExists(context.response.body);
        const responseBody = JSON.parse(context.response.body as string);

        assertEquals(responseBody.title, "Test Adventure");
        assertEquals(responseBody.author, "Test User");
        assertEquals(responseBody.description, "A test adventure.");
        assertEquals(responseBody.cover, "https://example.com/image.jpg");
    });

    it("should render an error page if the adventure is not found", async () => {
        const handler = new AdventureHandler(env);
        const context = createTestContext({
            api: {
                getAdventureEmbed: () => Promise.reject(new Error("Adventure not found"))
            } as unknown as AIDungeonAPI
        }, {
            id: "nonexistent-adventure"
        });

        await handler.handle(context as unknown as Context<AppState>);

        assertExists(context.response.body);
        const responseBody = JSON.parse(context.response.body as string);

        assertEquals(responseBody.type, "adventure");
        assertEquals(responseBody.id, "nonexistent-adventure");
    });

    it("should handle undefined description gracefully", async () => {
        const handler = new AdventureHandler(env);
        const mockAdventureData: AdventureEmbedData = {
            title: "Test Adventure with no description",
            description: null, // Explicitly set to null
            image: "https://example.com/image.jpg",
            user: {
                isMember: false,
                profile: {
                    title: "Test User",
                    thumbImageUrl: "https://example.com/thumb.jpg"
                }
            }
        } as AdventureEmbedData;

        const context = createTestContext({
            api: {
                getAdventureEmbed: () => Promise.resolve(mockAdventureData)
            } as unknown as AIDungeonAPI
        }, {
            id: "test-adventure-no-desc"
        });

        await handler.handle(context as unknown as Context<AppState>);

        assertExists(context.response.body);
        const responseBody = JSON.parse(context.response.body as string);

        assertEquals(responseBody.title, "Test Adventure with no description");
        assertEquals(responseBody.description, ""); // Should fall back to empty string
    });

    describe("analytics", () => {
        it("should report visibility for published adventures", async () => {
            const handler = new AdventureHandler(env);
            const mockAdventureData: AdventureEmbedData = {
                title: "Test Adventure",
                unlisted: false, // published
                user: { profile: { title: "Test User" } }
            } as AdventureEmbedData;

            const context = createTestContext({
                api: {
                    getAdventureEmbed: () => Promise.resolve(mockAdventureData)
                } as unknown as AIDungeonAPI
            }, {
                id: "test-adventure"
            });

            await handler.handle(context as unknown as Context<AppState>);

            assertEquals(context.state.analytics.content?.visibility, "Published");
        });

        it("should report visibility for unlisted adventures", async () => {
            const handler = new AdventureHandler(env);
            const mockAdventureData: AdventureEmbedData = {
                title: "Test Adventure",
                unlisted: true, // unlisted
                user: { profile: { title: "Test User" } }
            } as AdventureEmbedData;

            const context = createTestContext({
                api: {
                    getAdventureEmbed: () => Promise.resolve(mockAdventureData)
                } as unknown as AIDungeonAPI
            }, {
                id: "test-adventure"
            });

            await handler.handle(context as unknown as Context<AppState>);

            assertEquals(context.state.analytics.content?.visibility, "Unlisted");
        });
    });
});
