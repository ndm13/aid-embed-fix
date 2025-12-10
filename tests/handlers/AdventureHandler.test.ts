import { assertEquals, assertExists } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import { createMockContext, MockContext } from "@oak/oak/testing";
import { Environment, Template } from "npm:nunjucks";
import { AdventureHandler } from "@/src/handlers/AdventureHandler.ts";
import { AppState } from "@/src/types/AppState.ts";
import { AdventureEmbedData } from "@/src/types/EmbedDataTypes.ts";
import { RelatedLinks } from "@/src/support/RelatedLinks.ts";
import { Context } from "@oak/oak";

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

function createTestContext(state: Partial<AppState>, params: Record<string, string>): MockContext<AppState> {
    const context = createMockContext<AppState>({
        state: {
            metrics: {
                endpoint: "",
                type: "",
            },
            ...state,
        },
        params,
    });
    context.state.links = new RelatedLinks(context as unknown as Context<AppState>, {
        oembedProtocol: "https",
        defaultRedirectBase: "https://aid.com"
    });
    // @ts-ignore: userAgent is not on the mock type but is used by the handler
    context.request.userAgent = {
        ua: "Discordbot/2.0",
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
                profile: {
                    title: "Test User",
                    thumbImageUrl: "https://example.com/thumb.jpg",
                }
            }
        };

        const context = createTestContext({
            api: {
                getAdventureEmbed: () => Promise.resolve(mockAdventureData),
            },
        }, {
            id: "test-adventure",
        });

        await handler.handle(context);

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
                getAdventureEmbed: () => Promise.reject(new Error("Adventure not found")),
            },
        }, {
            id: "nonexistent-adventure",
        });

        await handler.handle(context);

        assertExists(context.response.body);
        const responseBody = JSON.parse(context.response.body as string);

        assertEquals(responseBody.type, "adventure");
        assertEquals(responseBody.id, "nonexistent-adventure");
    });

    it("should handle undefined description gracefully", async () => {
        const handler = new AdventureHandler(env);
        const mockAdventureData: AdventureEmbedData = {
            title: "Test Adventure with no description",
            description: undefined, // Explicitly set to undefined
            image: "https://example.com/image.jpg",
            user: {
                profile: {
                    title: "Test User",
                    thumbImageUrl: "https://example.com/thumb.jpg",
                }
            }
        };

        const context = createTestContext({
            api: {
                getAdventureEmbed: () => Promise.resolve(mockAdventureData),
            },
        }, {
            id: "test-adventure-no-desc",
        });

        await handler.handle(context);

        assertExists(context.response.body);
        const responseBody = JSON.parse(context.response.body as string);

        assertEquals(responseBody.title, "Test Adventure with no description");
        assertEquals(responseBody.description, ""); // Should fall back to empty string
    });
});