import { assertEquals } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import { createMockContext } from "../../mocks/context.ts";

describe("RelatedLinks", () => {
    it("should handle cover images", () => {
        // Test ?bi param
        const biContext = createMockContext({ query: { bi: "https://better.image/img.jpg" } });
        assertEquals(biContext.state.links.cover("original.jpg"), "https://better.image/img.jpg");

        // Test ?cover=none
        const noneContext = createMockContext({ query: { cover: "none" } });
        assertEquals(noneContext.state.links.cover("original.jpg"), null);
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

    it("should generate oEmbed URL", () => {
        const context = createMockContext({ path: "/test" });
        const url = context.state.links.oembed({ type: "Test" });
        assertEquals(url, "https://localhost/oembed.json?type=Test");
    });
});
