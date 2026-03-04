import { assertEquals } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import { createMockContext } from "../../mocks/context.ts";

describe("RelatedLinks", () => {
    it("should handle cover images", () => {
        const context = createMockContext();
        const links = context.state.links;

        // Pass-through
        assertEquals(links.cover("http://test.com/img.jpg"), "http://test.com/img.jpg");
        
        // UUID
        const uuid = "12345678-1234-1234-1234-1234567890ab";
        assertEquals(links.cover(`http://test.com/${uuid}`), `http://test.com/${uuid}/public`);

        // Catbox
        const catboxCtx = createMockContext({ query: { cover: "catbox:test.png" } });
        assertEquals(catboxCtx.state.links.cover("orig"), "https://files.catbox.moe/test.png");

        // Imgur
        const imgurCtx = createMockContext({ query: { cover: "imgur:test" } });
        assertEquals(imgurCtx.state.links.cover("orig"), "https://i.imgur.com/test.jpg");
    });

    it("should generate redirect URLs", () => {
        const context = createMockContext({
            path: "/test",
            query: { foo: "bar", baz: "qux" }
        });
        const links = context.state.links;

        // Filter params
        assertEquals(links.redirect(["foo"]), "https://play.aidungeon.com/test?foo=bar");
        
        // Force params
        assertEquals(links.redirect([], { a: "b" }), "https://play.aidungeon.com/test?a=b");
    });

    it("should respect environment settings", () => {
        const context = createMockContext({
            state: { settings: { proxy: { env: "beta", landing: "client" } } }
        });
        assertEquals(context.state.links.redirectBase, "https://beta.aidungeon.com");
    });

    it("should generate oEmbed URL", () => {
        const context = createMockContext({ path: "/test" });
        const url = context.state.links.oembed({ type: "Test" });
        assertEquals(url, "https://localhost/oembed.json?type=Test");
    });
});
