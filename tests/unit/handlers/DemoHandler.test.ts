import { assertEquals, assertExists } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import { Environment, Template } from "npm:nunjucks";
import { DemoHandler } from "@/src/handlers/DemoHandler.ts";
import { AppState } from "@/src/types/AppState.ts";
import { Context } from "@oak/oak";
import { createTestContext } from "../test_utils.ts";

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
        const context = createTestContext();

        await handler.handle(context as unknown as Context<AppState>);

        assertExists(context.response.body);
        const responseBody = JSON.parse(context.response.body as string);

        assertEquals(responseBody.title, "Fix AI Dungeon Link Previews!");
        assertEquals(responseBody.author, "ndm13");
        assertEquals(responseBody.link, "https://github.com/ndm13/aid-embed-fix");
    });
});
