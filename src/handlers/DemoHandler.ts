import {EmbedHandler} from "./EmbedHandler.ts";
import {Context} from "@oak/oak";
import {Environment} from "npm:nunjucks";
import type {AppState} from "../types/AppState.ts";

export class DemoHandler extends EmbedHandler<void> {
    readonly name = "root";
    readonly redirectKeys = [];

    protected readonly responseType = "demo";
    protected readonly oembedType = "Embed Fix";

    constructor(env: Environment) {
        super(env, "demo.njk", "embed-notfound.njk");
    }

    protected override getRedirectLink(_: Context<AppState>): string {
        return "https://github.com/ndm13/aid-embed-fix";
    }

    fetch(_ctx: Context<AppState>, _id: string): Promise<void> {
        return Promise.resolve();
    }

    protected prepareContext(ctx: Context<AppState>, _: void, link: string): object {
        return {
            title: "Fix AI Dungeon Link Previews!",
            author: "ndm13",
            description: `Get more details in your AI Dungeon links!
 • Change .com to .link, or
 • Post a link and type s/i/x!

Now you can see the link type, description, and image!

Fully open source, click the link for details!`,
            cover: 'https://github.com/ndm13/aid-embed-fix/blob/main/screenshots/sixfix_demo.gif?raw=true',
            link,
            oembed: ctx.state.links.oembed({
                title: "Fix AI Dungeon Link Previews!",
                type: this.oembedType
            })
        };
    }
}