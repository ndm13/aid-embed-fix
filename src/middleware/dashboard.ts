import { Context, send } from "@oak/oak";
import { Next } from "@oak/oak/middleware";
import { AppState } from "../types/AppState.ts";

const root = "./static/dashboard";

export function middleware() {
    return async (ctx: Context<AppState>, next: Next) => {
        if (ctx.request.url.searchParams.has("preview")) return await next();
        
        if (ctx.request.url.pathname === "/dashboard") {
            ctx.response.redirect("/dashboard/");
            return;
        }

        if (ctx.request.url.hostname.startsWith("my.") || ctx.request.url.pathname.startsWith("/dashboard/")) {
            ctx.state.analytics.request.middleware = "dashboard";
            ctx.state.metrics.router.endpoint = "dashboard";
            ctx.state.metrics.router.type = "static";

            await send(ctx, ctx.request.url.pathname.replace(/^(\/dashboard\/)?/, "/"), {
                root,
                index: "index.html"
            });
            return;
        }
        await next();
    };
}
