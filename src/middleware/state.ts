import { Context } from "@oak/oak";
import { Next } from "@oak/oak/middleware";

import { AIDungeonAPI } from "../api/AIDungeonAPI.ts";
import { RelatedLinks, RelatedLinksConfig } from "../support/RelatedLinks.ts";
import { AppState } from "../types/AppState.ts";

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
