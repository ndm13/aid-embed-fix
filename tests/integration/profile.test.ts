import { describe, it } from "@std/testing/bdd";
import { assertEquals, assertStringIncludes } from "@std/assert";
import { superoak } from "superoak";
import { app, parseMetaTags, createDiscordRequest, fetchOEmbed } from "./setup.ts";

describe("Profile Integration", () => {
    it("should return 200, correct meta tags, and valid oembed JSON for a found profile", async () => {
        const request = await superoak(app);
        const res = await createDiscordRequest(request.get("/profile/found-user"))
            .expect(200);

        const html = res.text;
        const meta = parseMetaTags(html);

        assertEquals(meta["og:title"], "Test User");
        assertStringIncludes(meta["og:description"], "Just testing things out");
        assertStringIncludes(meta["og:description"], "A".repeat(10));
        assertEquals(meta["og:image"], "https://example.com/avatar.png");

        const oembed = await fetchOEmbed(html);
        assertEquals(oembed.title, "Embed");
        assertEquals(oembed.provider_name, "AI Dungeon Profile");
        assertEquals(oembed.author_name, undefined);
    });

    it("should return 200 and format the Not Found page correctly for a missing profile", async () => {
        const request = await superoak(app);
        const res = await createDiscordRequest(request.get("/profile/not-found"))
            .expect(200);

        const html = res.text;
        const meta = parseMetaTags(html);
        assertEquals(meta["og:title"], "User Not Found!");
        
        const oembed = await fetchOEmbed(html);
        assertEquals(oembed.title, "Embed");
        assertEquals(oembed.type, "rich");
    });
});
