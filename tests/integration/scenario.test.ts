import { describe, it } from "@std/testing/bdd";
import { assertEquals, assertStringIncludes, assert } from "@std/assert";
import { superoak } from "superoak";
import { app, parseMetaTags, createDiscordRequest, fetchOEmbed, fetchGraphQLCalls, resetFetchCalls } from "./setup.ts";

describe("Scenario Integration", () => {
    it("should return 200, correct meta tags, and valid oembed JSON for a found, published scenario", async () => {
        const request = await superoak(app);
        const res = await createDiscordRequest(request.get("/scenario/found-published/test-tail"))
            .expect(200);

        const html = res.text;
        const meta = parseMetaTags(html);

        assertEquals(meta["og:title"], "Test Scenario");
        assertEquals(meta["og:description"], "A test scenario description");
        assertEquals(meta["og:image"], "https://example.com/image.png");

        // Validate oEmbed payload
        const oembed = await fetchOEmbed(html);
        assertEquals(oembed.title, "Embed");
        assertEquals(oembed.provider_name, "AI Dungeon Scenario");
        assertEquals(oembed.author_name, "Creator");
        assertStringIncludes(oembed.author_url, "/profile/Creator");
    });

    it("should query published before unlisted if visibility is not specified and return 200", async () => {
        resetFetchCalls();
        const request = await superoak(app);
        const res = await createDiscordRequest(request.get("/scenario/found-unlisted/test-tail"))
            .expect(200);

        // Verify API checked published first, then unlisted
        assert(fetchGraphQLCalls.length >= 2, "Should have made at least two GraphQL calls");
        assertEquals(fetchGraphQLCalls[0].variables.viewPublished, true);
        assertEquals(fetchGraphQLCalls[1].variables.viewPublished, false);

        const meta = parseMetaTags(res.text);
        assertEquals(meta["og:title"], "Unlisted Scenario");
        
        const oembed = await fetchOEmbed(res.text);
        assertEquals(oembed.author_name, "Anon");
    });

    it("should omit cover image from meta tags and body for a scenario with no cover image", async () => {
        const request = await superoak(app);
        const res = await createDiscordRequest(request.get("/scenario/no-cover/test-tail"))
            .expect(200);

        const html = res.text;
        const meta = parseMetaTags(html);
        
        assertEquals(meta["og:image"], undefined);
        assertEquals(meta["twitter:image"], undefined);
        
        const oembed = await fetchOEmbed(html);
        assertEquals(oembed.title, "Embed");
    });

    it("should parse custom cover images via query parameters", async () => {
        let request = await superoak(app);
        let res = await createDiscordRequest(request.get("/scenario/found-published/test-tail?bi=https://example.com/legacy.png")).expect(200);
        assertEquals(parseMetaTags(res.text)["og:image"], "https://example.com/legacy.png");

        request = await superoak(app);
        res = await createDiscordRequest(request.get("/scenario/found-published/test-tail?cover=catbox:abcd")).expect(200);
        assertEquals(parseMetaTags(res.text)["og:image"], "https://files.catbox.moe/abcd.jpg");

        request = await superoak(app);
        res = await createDiscordRequest(request.get("/scenario/found-published/test-tail?cover=imgur:abcd.png")).expect(200);
        assertEquals(parseMetaTags(res.text)["og:image"], "https://i.imgur.com/abcd.png");
    });

    it("should fallback to prompt if description is missing", async () => {
        const request = await superoak(app);
        const res = await createDiscordRequest(request.get("/scenario/prompt-fallback/test-tail"))
            .expect(200);

        const meta = parseMetaTags(res.text);
        assertEquals(meta["og:description"], "This is the prompt text");
    });

    it("should properly truncate extremely long descriptions", async () => {
        const request = await superoak(app);
        const res = await createDiscordRequest(request.get("/scenario/long-description/test-tail"))
            .expect(200);

        const meta = parseMetaTags(res.text);
        assert(meta["og:description"].length <= 1000, "Description should be truncated to 1000 characters or less");
        assertStringIncludes(meta["og:description"], "...");
    });

    it("should return 200 and format the Not Found page correctly for a missing scenario", async () => {
        const request = await superoak(app);
        const res = await createDiscordRequest(request.get("/scenario/not-found/test-tail"))
            .expect(200);

        const html = res.text;
        
        // Ensure "Not Found" message is surfaced in meta tags or inline oEmbed
        const meta = parseMetaTags(html);
        assertEquals(meta["og:title"], "Scenario Not Found!");
        
        const oembed = await fetchOEmbed(html);
        assertEquals(oembed.title, "Embed");
        assertEquals(oembed.type, "rich");
    });
});
