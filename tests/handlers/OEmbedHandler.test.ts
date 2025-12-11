import { assertEquals } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import { createMockContext } from "@oak/oak/testing";
import { OEmbedHandler } from "@/src/handlers/OEmbedHandler.ts";
import { AppState } from "@/src/types/AppState.ts";
import { RelatedLinks } from "@/src/support/RelatedLinks.ts";
import { Context } from "@oak/oak";

describe("OEmbedHandler", () => {
    const handler = new OEmbedHandler();

    function createTestContext(params: Record<string, string>) {
        const context = createMockContext({
            state: {
                metrics: {
                    endpoint: "",
                    type: ""
                }
            }
        });
        context.state.links = new RelatedLinks(context as unknown as Context<AppState>, {
            oembedProtocol: "https",
            defaultRedirectBase: "https://aid.com"
        });

        const url = new URL(context.request.url.href);
        for (const [key, value] of Object.entries(params)) {
            url.searchParams.set(key, value);
        }
        // @ts-ignore: read-only property
        context.request.url = url;

        return context;
    }

    it("should return 400 if type is missing", async () => {
        const context = createTestContext({});
        await handler.handle(context as unknown as Context<AppState>);
        assertEquals(context.response.status, 400);
    });

    it("should return oembed for Embed Fix", async () => {
        const context = createTestContext({ type: "Embed Fix" });
        await handler.handle(context as unknown as Context<AppState>);

        const body = JSON.parse(context.response.body as string);
        assertEquals(body.provider_name, "AI Dungeon Embed Fix");
        assertEquals(body.provider_url, "https://github.com/ndm13/aid-embed-fix");
    });

    it("should return oembed for other types", async () => {
        const context = createTestContext({ type: "Scenario", author: "testuser" });
        await handler.handle(context as unknown as Context<AppState>);

        const body = JSON.parse(context.response.body as string);
        assertEquals(body.provider_name, "AI Dungeon Scenario");
        assertEquals(body.provider_url, "https://aid.com");
        assertEquals(body.author_name, "testuser");
        assertEquals(body.author_url, "https://aid.com/profile/testuser");
    });

    it("should not include author for Profile type", async () => {
        const context = createTestContext({ type: "Profile", author: "testuser" });
        await handler.handle(context as unknown as Context<AppState>);

        const body = JSON.parse(context.response.body as string);
        assertEquals(body.provider_name, "AI Dungeon Profile");
        assertEquals(body.author_name, undefined);
    });
});
