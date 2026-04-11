import { Router } from "@oak/oak";

import { AppState } from "../types/AppState.ts";
import { serveStatic } from "../support/vfs.ts";

export function router() {
    const router = new Router<AppState>();

    router.use(async (ctx, next) => {
        ctx.state.analytics.request.middleware = "statics";
        await next();
    });

    router.get("/healthcheck", (ctx) => {
        ctx.state.metrics.router.endpoint = "healthcheck";
        ctx.state.metrics.router.type = "static";
        ctx.response.body = "ok";
    });

    router.get("/(style.css|robots.txt)", async (ctx) => {
        ctx.state.metrics.router.endpoint = "static";
        ctx.state.metrics.router.type = "static";
        await serveStatic(ctx, "./static");
    });

    return router;
}
