import {Router} from "@oak/oak";

import {Renderer} from "../Renderer.ts";

import {tryForward} from "../utils/router.ts";

export function createStaticRouter(renderer: Renderer) {
    const router = new Router();

    router.get("/healthcheck", ctx => {
        ctx.state.metrics.endpoint = "healthcheck";
        ctx.state.metrics.type = "static";
        ctx.response.body = "ok";
    });


    router.get("/(style.css|robots.txt)", async ctx => {
        ctx.state.metrics.endpoint = "static";
        ctx.state.metrics.type = "static";
        await ctx.send({
            root: './static'
        });
    });

    router.get("/", ctx => {
        ctx.state.metrics.endpoint = "root";
        const link = "https://github.com/ndm13/aid-embed-fix";
        if (tryForward(ctx, link)) return;
        // Otherwise generate embed demo
        ctx.state.metrics.type = "static";
        ctx.response.body = renderer.demo(ctx, link);
    });

    return router;
}