import {RelatedLinks, RelatedLinksConfig} from "../support/RelatedLinks.ts";
import { Context } from "@oak/oak";
import type {AppState} from "../types/AppState.ts";
import { Next } from "@oak/oak/middleware";
import {AIDungeonAPI} from "../api/AIDungeonAPI.ts";

export function middleware(api: AIDungeonAPI, linkConfig: RelatedLinksConfig) {
    return async (ctx: Context<AppState>, next: Next) => {
        ctx.state = {
            api,
            metrics: {},
            links: new RelatedLinks(ctx, linkConfig)
        };
        await next();
    };
}