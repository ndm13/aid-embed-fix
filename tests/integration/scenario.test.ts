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
        assertEquals(meta["og:description"], "A test scenario description\n\nWith multiple lines\nto test formatting...");
        assertEquals(meta["og:image"], "https://example.com/image.png");
        assertStringIncludes(html, "A test scenario description\n    <br>\n    \n    <br>\n    With multiple lines\n    <br>\n    to test formatting...");

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

    it("should query strictly published state when the published query parameter is present", async () => {
        resetFetchCalls();
        const request = await superoak(app);
        await createDiscordRequest(request.get("/scenario/found-published/test-tail?published=true"))
            .expect(200);

        // Verify API checked ONLY published
        assertEquals(fetchGraphQLCalls.length, 1);
        assertEquals(fetchGraphQLCalls[0].variables.viewPublished, true);
    });

    it("should query strictly unlisted state when the unlisted query parameter is present", async () => {
        resetFetchCalls();
        const request = await superoak(app);
        await createDiscordRequest(request.get("/scenario/found-unlisted/test-tail?unlisted=true"))
            .expect(200);

        // Verify API checked ONLY unlisted
        assertEquals(fetchGraphQLCalls.length, 1);
        assertEquals(fetchGraphQLCalls[0].variables.viewPublished, false);
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

    it("should return 200 with fallback properties when description and prompt are null, and visibility is hidden", async () => {
        const request = await superoak(app);
        const res = await createDiscordRequest(request.get("/scenario/null-text-visibility/test-tail"))
            .expect(200);

        const meta = parseMetaTags(res.text);
        assertEquals(meta["og:description"], "");
        assertEquals(meta["aid:visibility"], undefined);
    });

    it("should gracefully handle a hard 500 API error from the backend and return Not Found", async () => {
        const request = await superoak(app);
        const res = await createDiscordRequest(request.get("/scenario/server-error/test-tail"))
            .expect(200);

        const meta = parseMetaTags(res.text);
        assertEquals(meta["og:title"], "Scenario Not Found!");
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

    it("should gracefully handle a hard socket disconnect (TypeError) mapping to net_error", async () => {
        const request = await superoak(app);
        const res = await createDiscordRequest(request.get("/scenario/net-error/test-tail"))
            .expect(200);

        const meta = parseMetaTags(res.text);
        assertEquals(meta["og:title"], "Scenario Not Found!");
    });

    it("should natively bypass forwarding logic when ?no_ua is present regardless of user agent", async () => {
        const request = await superoak(app);
        // Using a non-discordbot agent that normally gets bypassed because the router logic
        // defaults to 301 forwarding normal users. ?no_ua forces 200 explicitly.
        await request.get("/scenario/found-published/test-tail?no_ua=true")
            .set("User-Agent", "Mozilla/5.0")
            .expect(200);
    });

    it("should force a local 200 rendering for normal clients if proxy.landing is configured to preview via cookies", async () => {
        const request = await superoak(app);
        await request.get("/scenario/found-published/test-tail")
            .set("User-Agent", "Mozilla/5.0 / Normal Browser")
            .set("Cookie", `proxy_settings=${encodeURIComponent(JSON.stringify({ landing: "preview" }))}`)
            .expect(200);
    });

    it("should force a local 200 rendering for normal clients if proxy.landing is configured to client via cookies", async () => {
        const request = await superoak(app);
        await request.get("/scenario/found-published/test-tail")
            .set("User-Agent", "Mozilla/5.0 / Normal Browser")
            .set("Cookie", `proxy_settings=${encodeURIComponent(JSON.stringify({ landing: "client" }))}`)
            .expect(200);
    });
});
