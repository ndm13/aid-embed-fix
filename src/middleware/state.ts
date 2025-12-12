import { Context } from "@oak/oak";
import { Next } from "@oak/oak/middleware";

import { AIDungeonAPI } from "../api/AIDungeonAPI.ts";
import { RelatedLinks, RelatedLinksConfig } from "../support/RelatedLinks.ts";
import { AppState } from "../types/AppState.ts";

export function middleware(api: AIDungeonAPI, linkConfig: RelatedLinksConfig) {
    return async (ctx: Context<AppState>, next: Next) => {
        ctx.state = {
            api,
            metrics: {
                router: {}
            },
            analytics: {
                timestamp: Date.now(),
                content: {
                    status: "unknown"
                },
                request: {
                    hostname: ctx.request.url.hostname,
                    path: ctx.request.url.pathname,
                    params: Object.fromEntries(ctx.request.url.searchParams),
                    userAgent: ctx.request.userAgent.ua
                }
            },
            links: new RelatedLinks(ctx, linkConfig)
        };
        await next();
    };
}
