import { assertEquals } from "@std/assert";
import { describe, it } from "@std/testing/bdd";

import { OEmbedHandler } from "@/src/handlers/OEmbedHandler.ts";
import { createMockContext } from "../../mocks/context.ts";

describe("OEmbedHandler", () => {
    it("should return JSON for Embed Fix", async () => {
        const handler = new OEmbedHandler();
        const context = createMockContext({
            query: { type: "Embed Fix" }
        });

        await handler.handle(context);
        assertEquals(context.response.headers.get("content-type"), "application/json");
        const body = JSON.parse(context.response.body as string);
        assertEquals(body.provider_url, "https://github.com/ndm13/aid-embed-fix");
    });

    it("should return JSON for Scenario/Adventure", async () => {
        const handler = new OEmbedHandler();
        const context = createMockContext({
            query: { type: "Scenario", author: "User" }
        });

        await handler.handle(context);
        const body = JSON.parse(context.response.body as string);
        assertEquals(body.provider_url, "https://play.aidungeon.com");
        assertEquals(body.author_name, "User");
    });

    it("should return 400 if type is missing", async () => {
        const handler = new OEmbedHandler();
        const context = createMockContext({ query: {} });

        await handler.handle(context);
        assertEquals(context.response.status, 400);
    });
});
