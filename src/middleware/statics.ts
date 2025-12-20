import { Router } from "@oak/oak";

import { AppState } from "../types/AppState.ts";

export function router() {
    const router = new Router<AppState>();

    router.get("/healthcheck", (ctx) => {
        ctx.state.analytics.content.type = "healthcheck";
        ctx.state.metrics.router.endpoint = "healthcheck";
        ctx.state.metrics.router.type = "static";
        ctx.response.body = "ok";
    });

    router.get("/(style.css|robots.txt)", async (ctx) => {
        ctx.state.analytics.content.type = "static";
        ctx.state.metrics.router.endpoint = "static";
        ctx.state.metrics.router.type = "static";
        await ctx.send({
            root: "./static"
        });
    });

    return router;
}
