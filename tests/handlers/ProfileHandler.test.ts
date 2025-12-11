import { assertEquals, assertExists } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import { createMockContext } from "@oak/oak/testing";
import { Environment, Template } from "npm:nunjucks";
import { ProfileHandler } from "@/src/handlers/ProfileHandler.ts";
import { AppState } from "@/src/types/AppState.ts";
import { UserEmbedData } from "@/src/types/EmbedDataTypes.ts";
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

function createTestContext(state: Partial<AppState>, params: Record<string, string>, userAgent = "Discordbot/2.0") {
    const context = createMockContext({
        state: {
            metrics: {
                endpoint: "",
                type: ""
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
        ua: userAgent
    };
    return context;
}

describe("ProfileHandler", () => {
    const env = new MockEnvironment() as unknown as Environment;

    it("should render a user profile", async () => {
        const handler = new ProfileHandler(env);
        const mockUserData = {
            profile: {
                title: "Test User",
                description: "A test user profile.",
                thumbImageUrl: "https://example.com/thumb.jpg"
            }
        } as UserEmbedData;

        const context = createTestContext({
            api: {
                getUserEmbed: () => Promise.resolve(mockUserData)
            } as unknown as AIDungeonAPI
        }, {
            username: "testuser"
        });

        await handler.handle(context as unknown as Context<AppState>);

        assertExists(context.response.body);
        const responseBody = JSON.parse(context.response.body as string);

        assertEquals(responseBody.title, "Test User");
        assertEquals(responseBody.description, "A test user profile.");
        assertEquals(responseBody.icon, "https://example.com/thumb.jpg");
    });

    it("should render an error page if the user is not found", async () => {
        const handler = new ProfileHandler(env);
        const context = createTestContext({
            api: {
                getUserEmbed: () => Promise.reject(new Error("User not found"))
            } as unknown as AIDungeonAPI
        }, {
            username: "nonexistentuser"
        });

        await handler.handle(context as unknown as Context<AppState>);

        assertExists(context.response.body);
        const responseBody = JSON.parse(context.response.body as string);

        assertEquals(responseBody.type, "user");
        assertEquals(responseBody.id, "nonexistentuser");
    });

    it("should redirect non-Discord user agents", async () => {
        const handler = new ProfileHandler(env);
        const context = createTestContext({}, { username: "testuser" }, "Mozilla/5.0");
        // @ts-ignore: read-only property
        context.request.url.pathname = "/profile/testuser";

        let redirectedUrl = "";
        context.response.redirect = ((url: string | URL) => {
            redirectedUrl = url.toString();
        }) as any;

        await handler.handle(context as unknown as Context<AppState>);

        assertEquals(context.response.status, 301);
        assertEquals(redirectedUrl, "https://aid.com/profile/testuser");
    });

    it("should not redirect with no_ua flag", async () => {
        const handler = new ProfileHandler(env);
        const mockUserData = {
            profile: {
                title: "Test User",
                description: "A test user profile.",
                thumbImageUrl: "https://example.com/thumb.jpg"
            }
        } as UserEmbedData;
        const context = createTestContext({
            api: {
                getUserEmbed: () => Promise.resolve(mockUserData)
            } as unknown as AIDungeonAPI
        }, {
            username: "testuser"
        }, "Mozilla/5.0");
        context.request.url.searchParams.set("no_ua", "true");

        await handler.handle(context as unknown as Context<AppState>);

        assertEquals(context.response.status, 200);
        assertExists(context.response.body);
    });
});
