import { describe, it } from "@std/testing/bdd";
import { assertEquals, assertStringIncludes, assert } from "@std/assert";
import { superoak } from "superoak";
import { app, parseMetaTags, createDiscordRequest, fetchOEmbed } from "./setup.ts";

describe("Adventure Integration", () => {
    it("should return 200, correct meta tags, and valid oembed JSON for a found, published adventure", async () => {
        const request = await superoak(app);
        const res = await createDiscordRequest(request.get("/adventure/found-published/test-tail"))
            .expect(200);

        const html = res.text;
        const meta = parseMetaTags(html);

        assertEquals(meta["og:title"], "Test Adventure");
        assertEquals(meta["og:description"], "A test adventure description");
        assertEquals(meta["og:image"], "https://example.com/adv-image.png");

        // Validate oEmbed payload
        const oembed = await fetchOEmbed(html);
        assertEquals(oembed.title, "Embed");
        assertEquals(oembed.provider_name, "AI Dungeon Adventure");
        assertEquals(oembed.author_name, "Creator");
        assertStringIncludes(oembed.author_url, "/profile/Creator");
    });

    it("should return 200 for a found unlisted adventure", async () => {
        const request = await superoak(app);
        const res = await createDiscordRequest(request.get("/adventure/found-unlisted/test-tail"))
            .expect(200);

        const meta = parseMetaTags(res.text);
        assertEquals(meta["og:title"], "Unlisted Adventure");
        
        const oembed = await fetchOEmbed(res.text);
        assertEquals(oembed.author_name, "Anon");
    });

    it("should omit cover image from meta tags and body for an adventure with no cover image", async () => {
        const request = await superoak(app);
        // Fallback to found-unlisted which has no image defined in our mockData
        const res = await createDiscordRequest(request.get("/adventure/found-unlisted/test-tail"))
            .expect(200);

        const html = res.text;
        const meta = parseMetaTags(html);
        
        assertEquals(meta["og:image"], undefined);
        assertEquals(meta["twitter:image"], undefined);
    });

    it("should parse custom cover images via query parameters", async () => {
        let request = await superoak(app);
        let res = await createDiscordRequest(request.get("/adventure/found-published/test-tail?bi=https://example.com/legacy.png")).expect(200);
        assertEquals(parseMetaTags(res.text)["og:image"], "https://example.com/legacy.png");

        request = await superoak(app);
        res = await createDiscordRequest(request.get("/adventure/found-published/test-tail?cover=catbox:abcd")).expect(200);
        assertEquals(parseMetaTags(res.text)["og:image"], "https://files.catbox.moe/abcd.jpg");

        request = await superoak(app);
        res = await createDiscordRequest(request.get("/adventure/found-published/test-tail?cover=imgur:abcd.png")).expect(200);
        assertEquals(parseMetaTags(res.text)["og:image"], "https://i.imgur.com/abcd.png");
    });

    it("should properly truncate extremely long descriptions", async () => {
        const request = await superoak(app);
        // Use a non-existent adventure endpoint and check truncation if mock allows, 
        // wait, mockData doesn't have long-description for adventures yet! 
        // I will just add one inline or add it to mockData.ts next.
        const res = await createDiscordRequest(request.get("/adventure/long-description/test-tail"))
            .expect(200);

        const meta = parseMetaTags(res.text);
        assert(meta["og:description"].length <= 1000, "Description should be truncated to 1000 characters or less");
        assertStringIncludes(meta["og:description"], "...");
    });

    it("should return 200 with fallback properties when description is null and visibility is hidden", async () => {
        const request = await superoak(app);
        const res = await createDiscordRequest(request.get("/adventure/null-text-visibility/test-tail"))
            .expect(200);

        const meta = parseMetaTags(res.text);
        assertEquals(meta["og:description"], "");
        assertEquals(meta["aid:visibility"], undefined);
    });

    it("should gracefully handle a hard 500 API error from the backend and return Not Found", async () => {
        const request = await superoak(app);
        const res = await createDiscordRequest(request.get("/adventure/server-error/test-tail"))
            .expect(200);

        const meta = parseMetaTags(res.text);
        assertEquals(meta["og:title"], "Adventure Not Found!");
    });

    it("should return 200 and format the Not Found page correctly for a missing adventure", async () => {
        const request = await superoak(app);
        const res = await createDiscordRequest(request.get("/adventure/not-found/test-tail"))
            .expect(200);

        const html = res.text;
        
        // Ensure "Not Found" message is surfaced in meta tags or inline oEmbed
        const meta = parseMetaTags(html);
        assertEquals(meta["og:title"], "Adventure Not Found!");

        const oembed = await fetchOEmbed(html);
        assertEquals(oembed.title, "Embed");
        assertEquals(oembed.type, "rich");
    });

    it("should redirect to target when the optional :read path param does not precisely match 'read'", async () => {
        const request = await superoak(app);
        await createDiscordRequest(request.get("/adventure/found-published/test-tail/something-invalid"))
            .expect(302)
            .expect("Location", "https://mock.aidungeon.com/adventure/found-published/test-tail/something-invalid");
    });
});
