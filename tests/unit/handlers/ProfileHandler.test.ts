import { assertEquals } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import { Environment, Template } from "npm:nunjucks";

import { ProfileHandler } from "@/src/handlers/ProfileHandler.ts";
import { createMockContext } from "../../mocks/context.ts";
import { mockUser } from "../../mocks/data.ts";
import { MockAIDungeonAPI } from "../../mocks/api.ts";

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

describe("ProfileHandler", () => {
    const env = new MockEnvironment() as unknown as Environment;

    it("should render a user profile", async () => {
        const handler = new ProfileHandler(env);
        const api = new MockAIDungeonAPI();
        const user = mockUser();
        // @ts-ignore: stubbing method
        api.getUserEmbed = () => Promise.resolve(user);

        const context = createMockContext({
            params: { username: "user" },
            state: { api: api as unknown as any }
        });

        await handler.handle(context);
        const body = JSON.parse(context.response.body as string);
        assertEquals(body.title, "Test User");
    });

    it("should render error template on API error", async () => {
        const handler = new ProfileHandler(env);
        const api = new MockAIDungeonAPI();
        // @ts-ignore: testing error
        api.getUserEmbed = () => MockAIDungeonAPI.error();

        const context = createMockContext({
            params: { username: "user" },
            state: { api: api as unknown as any }
        });

        await handler.handle(context);
        const body = JSON.parse(context.response.body as string);
        assertEquals(body.type, "user");
    });
});
