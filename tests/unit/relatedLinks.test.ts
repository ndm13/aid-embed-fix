import { describe, it } from "@std/testing/bdd";
import { assertEquals } from "@std/assert";
import { RelatedLinks } from "../../src/support/RelatedLinks.ts";

describe("RelatedLinks Formatting Unit Tests", () => {
    it("should map hexadecimal UUID images directly with /public extensions seamlessly", () => {
        const rl = new RelatedLinks({ request: { url: { searchParams: { get: () => null } } } } as any, { defaultRedirectBase: "", oembedProtocol: "" });
        const legacyUUIDImage = "https://images.aidungeon.com/covers/12345678-1234-1234-1234-123456789abc";
        assertEquals(rl.cover(legacyUUIDImage), legacyUUIDImage + "/public");
    });

    it("should safely evaluate environments for base URL strings explicitly mapping play/alpha/beta", () => {
        const createRl = (env?: string, host = "testing.com") => new RelatedLinks(
            { request: { url: { host } }, state: { settings: { proxy: { env } } } } as any,
            { defaultRedirectBase: "https://play.aidungeon.com", oembedProtocol: "https" }
        );

        assertEquals(createRl("prod").redirectBase, "https://play.aidungeon.com");
        assertEquals(createRl("beta").redirectBase, "https://beta.aidungeon.com");
        assertEquals(createRl("alpha").redirectBase, "https://alpha.aidungeon.com");
        assertEquals(createRl(undefined, "beta.testing.com").redirectBase, "https://beta.aidungeon.com");
        assertEquals(createRl(undefined, "alpha.testing.com").redirectBase, "https://alpha.aidungeon.com");
    });
});
