import { assertEquals, assertExists } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import { createMockContext } from "@oak/oak/testing";
import { Environment, Template } from "npm:nunjucks";
import { DemoHandler } from "@/src/handlers/DemoHandler.ts";
import { AppState } from "@/src/types/AppState.ts";
import { RelatedLinks } from "@/src/support/RelatedLinks.ts";
import { Context } from "@oak/oak";

class MockTemplate {
    render(context: object): string {
        return JSON.stringify(context);
    }
}

class MockEnvironment {
    getTemplate(_name: string): Template {
        return new MockTemplate() as unknown as Template;
    }
}

describe("DemoHandler", () => {
    it("should render the demo page", async () => {
        const handler = new DemoHandler(new MockEnvironment() as unknown as Environment);
        const context = createMockContext({
            state: {
                metrics: {
                    endpoint: "",
                    type: "",
                }
            },
            params: {},
        });
        context.state.links = new RelatedLinks(context as unknown as Context<AppState>, {
            oembedProtocol: "https",
            defaultRedirectBase: "https://aid.com"
        });
        // @ts-ignore: userAgent is not on the mock type but is used by the handler
        context.request.userAgent = {
            ua: "Discordbot/2.0",
        };

        await handler.handle(context as unknown as Context<AppState>);

        assertExists(context.response.body);
        const responseBody = JSON.parse(context.response.body as string);

        assertEquals(responseBody.title, "Fix AI Dungeon Link Previews!");
        assertEquals(responseBody.author, "ndm13");
        assertEquals(responseBody.link, "https://github.com/ndm13/aid-embed-fix");
    });
});