import { describe, it } from "@std/testing/bdd";
import { assertEquals, assertStringIncludes } from "@std/assert";
import { superoak } from "superoak";
import { app, parseMetaTags, createDiscordRequest, fetchOEmbed } from "./setup.ts";

describe("Demo Integration", () => {
    it("should return 200, correct meta tags, and valid oembed JSON for the index route", async () => {
        const request = await superoak(app);
        const res = await createDiscordRequest(request.get("/"))
            .expect(200);

        const html = res.text;
        const meta = parseMetaTags(html);

        assertEquals(meta["og:title"], "Fix AI Dungeon Link Previews!");
        assertStringIncludes(meta["og:description"], "Get more details in your AI Dungeon links!");
        assertEquals(meta["og:image"], "https://github.com/ndm13/aid-embed-fix/blob/main/screenshots/sixfix_demo.gif?raw=true");

        const oembed = await fetchOEmbed(html);
        assertEquals(oembed.title, "Embed");
        assertEquals(oembed.provider_name, "AI Dungeon Embed Fix");
        assertEquals(oembed.type, "rich");
    });

    it("should safely bypass cache mechanics if ?preview parameter is manually passed to unsupported rendering types", async () => {
        const request = await superoak(app);
        await createDiscordRequest(request.get("/?preview=true"))
            .expect(200);
    });
});
