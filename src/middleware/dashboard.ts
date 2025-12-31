import { Context, send } from "@oak/oak";
import { Next } from "@oak/oak/middleware";
import { AppState } from "../types/AppState.ts";

const root = "./dashboard/dist";

export function middleware() {
    return async (ctx: Context<AppState>, next: Next) => {
        if (ctx.request.url.hostname.startsWith("my.")) {
            ctx.state.analytics.request.middleware = "dashboard";
            ctx.state.metrics.router.endpoint = "dashboard";
            ctx.state.metrics.router.type = "static";

            try {
                await send(ctx, ctx.request.url.pathname, {
                    root,
                    index: "index.html"
                });
            } catch {
                if (ctx.request.accepts("html")) {
                    try {
                        await send(ctx, "index.html", { root });
                    } catch {
                        ctx.response.status = 404;
                        ctx.response.body = "Dashboard build not found.";
                    }
                } else {
                    ctx.response.status = 404;
                }
            }
            return;
        }
        await next();
    };
}
