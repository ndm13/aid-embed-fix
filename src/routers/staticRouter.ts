import {Router} from "@oak/oak";

export default function staticRouter() {
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

    return router;
}