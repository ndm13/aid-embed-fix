import { assertEquals } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import { Context } from "@oak/oak";
import { RelatedLinks, RelatedLinksConfig } from "@/src/support/RelatedLinks.ts";
import { AppState } from "@/src/types/AppState.ts";

function createMockContext(url: string): Context<AppState> {
    return {
        request: {
            url: new URL(url)
        },
        state: {}
    } as Context<AppState>;
}

describe("RelatedLinks", () => {
    const config: RelatedLinksConfig = {
        oembedProtocol: "https",
        defaultRedirectBase: "https://aidungeon.com"
    };

    describe("cover", () => {
        it("should return the better image URL if 'bi' param is present", () => {
            const ctx = createMockContext("http://localhost/?bi=http://example.com/image.jpg");
            const relatedLinks = new RelatedLinks(ctx, config);
            assertEquals(relatedLinks.cover(""), "http://example.com/image.jpg");
        });

        it("should return null if 'cover' param is 'none'", () => {
            const ctx = createMockContext("http://localhost/?cover=none");
            const relatedLinks = new RelatedLinks(ctx, config);
            assertEquals(relatedLinks.cover(""), null);
        });

        it("should construct catbox URL", () => {
            const ctx = createMockContext("http://localhost/?cover=catbox:some-image");
            const relatedLinks = new RelatedLinks(ctx, config);
            assertEquals(relatedLinks.cover(""), "https://files.catbox.moe/some-image.jpg");
        });

        it("should construct catbox URL with extension", () => {
            const ctx = createMockContext("http://localhost/?cover=catbox:some-image.png");
            const relatedLinks = new RelatedLinks(ctx, config);
            assertEquals(relatedLinks.cover(""), "https://files.catbox.moe/some-image.png");
        });

        it("should construct imgur URL", () => {
            const ctx = createMockContext("http://localhost/?cover=imgur:some-image");
            const relatedLinks = new RelatedLinks(ctx, config);
            assertEquals(relatedLinks.cover(""), "https://i.imgur.com/some-image.jpg");
        });

        it("should handle leading slashes in cover slug", () => {
            const ctx = createMockContext("http://localhost/?cover=catbox:///some-image");
            const relatedLinks = new RelatedLinks(ctx, config);
            assertEquals(relatedLinks.cover(""), "https://files.catbox.moe/some-image.jpg");
        });

        it("should return original image if cover param is invalid", () => {
            const ctx = createMockContext("http://localhost/?cover=invalid");
            const relatedLinks = new RelatedLinks(ctx, config);
            assertEquals(relatedLinks.cover("http://example.com/original.jpg"), "http://example.com/original.jpg");
        });

        it("should append /public to UUID-like image URLs", () => {
            const ctx = createMockContext("http://localhost/");
            const relatedLinks = new RelatedLinks(ctx, config);
            const imageUrl = "http://example.com/00000000-0000-0000-0000-000000000000";
            assertEquals(relatedLinks.cover(imageUrl), `${imageUrl}/public`);
        });

        it("should return original image for non-UUID-like URLs", () => {
            const ctx = createMockContext("http://localhost/");
            const relatedLinks = new RelatedLinks(ctx, config);
            const imageUrl = "http://example.com/image.jpg";
            assertEquals(relatedLinks.cover(imageUrl), imageUrl);
        });
    });

    describe("oembed", () => {
        it("should generate a correct oembed URL", () => {
            const ctx = createMockContext("http://localhost/");
            const relatedLinks = new RelatedLinks(ctx, config);
            const params = { url: "http://example.com", format: "json" };
            assertEquals(
                relatedLinks.oembed(params),
                "https://localhost/oembed.json?url=http%3A%2F%2Fexample.com&format=json"
            );
        });
    });

    describe("redirect", () => {
        it("should generate a redirect URL with specified params", () => {
            const ctx = createMockContext("http://localhost/test/path?a=1&b=2&c=3");
            const relatedLinks = new RelatedLinks(ctx, config);
            assertEquals(relatedLinks.redirect(["a", "c"]), "https://aidungeon.com/test/path?a=1&c=3");
        });

        it("should generate a redirect URL with no params if none are passed", () => {
            const ctx = createMockContext("http://localhost/test/path?a=1&b=2");
            const relatedLinks = new RelatedLinks(ctx, config);
            assertEquals(relatedLinks.redirect([]), "https://aidungeon.com/test/path");
        });
    });

    describe("redirectBase", () => {
        it("should return play.aidungeon.com for play host", () => {
            const ctx = createMockContext("http://play.aidungeon.com/");
            const relatedLinks = new RelatedLinks(ctx, config);
            assertEquals(relatedLinks.redirectBase, "https://play.aidungeon.com");
        });

        it("should return beta.aidungeon.com for beta host", () => {
            const ctx = createMockContext("http://beta.aidungeon.com/");
            const relatedLinks = new RelatedLinks(ctx, config);
            assertEquals(relatedLinks.redirectBase, "https://beta.aidungeon.com");
        });

        it("should return alpha.aidungeon.com for alpha host", () => {
            const ctx = createMockContext("http://alpha.aidungeon.com/");
            const relatedLinks = new RelatedLinks(ctx, config);
            assertEquals(relatedLinks.redirectBase, "https://alpha.aidungeon.com");
        });

        it("should return default for other hosts", () => {
            const ctx = createMockContext("http://localhost/");
            const relatedLinks = new RelatedLinks(ctx, config);
            assertEquals(relatedLinks.redirectBase, "https://aidungeon.com");
        });
    });
});
