import { EmbedHandler } from "./EmbedHandler.ts";
import { Context } from "@oak/oak";
import { oembedLink } from "../utils/rendering.ts";

export class DemoHandler extends EmbedHandler<void> {
    readonly name = "root";
    readonly redirectKeys = [];

    protected readonly errorType = "demo";
    protected readonly oembedType = "Embed Fix";

    constructor(api: AIDungeonAPI, env: Environment) {
        super(api, env, "demo.njk", "embed-notfound.njk");
    }

    protected getRedirectLink(_: Context): string {
        return "https://github.com/ndm13/aid-embed-fix";
    }

    fetch(_: string): Promise<void> {
        return Promise.resolve();
    }

    protected prepareContext(ctx: Context, _: void) {
        return {
            title: "Fix AI Dungeon Link Previews!",
            author: "ndm13",
            description: `Get more details in your AI Dungeon links!
 • Change .com to .link, or
 • Post a link and type s/i/x!

Now you can see the link type, description, and image!

Fully open source, click the link for details!`,
            cover: 'https://github.com/ndm13/aid-embed-fix/blob/main/screenshots/sixfix_demo.gif?raw=true',
            link: ctx.state.redirectLink,
            oembed: oembedLink(ctx, {
                title: "Fix AI Dungeon Link Previews!",
                type: this.oembedType
            })
        };
    }
}