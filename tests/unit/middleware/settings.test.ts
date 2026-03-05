import { assertEquals } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import { FakeTime } from "@std/testing/time";
import { middleware, router } from "@/src/middleware/settings.ts";
import { createMockContext } from "../../mocks/context.ts";

describe("Settings Middleware", () => {
    it("should parse valid cookies", async () => {
        const mw = middleware();
        const context = createMockContext({
            cookies: {
                link_settings: encodeURIComponent(JSON.stringify({ env: "beta" })),
                proxy_settings: encodeURIComponent(JSON.stringify({ landing: "preview" }))
            }
        });
        await mw(context, () => Promise.resolve());

        assertEquals(context.state.settings.link?.env, "beta");
        assertEquals(context.state.settings.proxy?.landing, "preview");
    });

    it("should handle invalid JSON in cookies", async () => {
        const mw = middleware();
        const context = createMockContext({
            cookies: {
                link_settings: "invalid-json",
                proxy_settings: "{not-json}"
            }
        });
        await mw(context, () => Promise.resolve());

        assertEquals(context.state.settings.link, undefined);
        assertEquals(context.state.settings.proxy, undefined);
    });
});
