import { Context } from "@oak/oak";
import type {AppState} from "../types/AppState.ts";
import {Handler} from "./Handler.ts";

export class OEmbedHandler implements Handler {
    handle(ctx: Context<AppState>): Promise<void> {
        const {links} = ctx.state;
        ctx.state.metrics.endpoint = "oembed";
        ctx.state.metrics.type = "static";
        const params = ctx.request.url.searchParams;
        if (!params.has("type")) {
            ctx.response.status = 400;
            return;
        }
        const oembed = {
            provider_name: 'AI Dungeon ' + params.get("type"),
            provider_url: params.get('type') === "Embed Fix" ? "https://github.com/ndm13/aid-embed-fix" : links.redirectBase,
            title: "Embed",
            type: 'rich',
            version: '1.0'
        } as Record<string,string>;

        if (params.get("type") !== "Profile" && params.has('author')) {
            oembed.author_name = params.get("author") as string;
            oembed.author_url = `${links.redirectBase}/profile/${params.get("author")}`;
        }

        ctx.response.headers.set("content-type", "application/json");
        ctx.response.body = JSON.stringify(oembed);
    }
}