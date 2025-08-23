import {Router} from "@oak/oak";

import config from "../config.ts";
import metrics from "../metrics.ts";

export function createMetricsRouter() {
    const router = new Router();

    router.use(async (ctx, next) => {
        const start = Date.now();
        ctx.state.metrics = {};
        await next();
        metrics.recordEndpoint(ctx.state.metrics?.endpoint || "unknown", Date.now() - start, ctx.state.metrics?.type || "unknown");
    });

    router.get("/metrics", ctx => {
        ctx.state.metrics.endpoint = "metrics";

        if (config.metrics.key) {
            const params = ctx.request.url.searchParams;
            if (!params.has("key") || params.get("key") !== config.metrics.key) {
                ctx.state.metrics.type = "error";
                ctx.response.status = 401;
                ctx.response.type = "application/json";
                ctx.response.body = {
                    error: {
                        details: "Incorrect or missing metrics key. If using the default config, a key has been generated for you and will be in the log."
                    }
                }
                return;
            }
        }

        ctx.state.metrics.type = "success";
        const status = {
            api: metrics.api,
            router: metrics.router,
            window: metrics.window
        };
        ctx.response.type = "application/json";
        ctx.response.body = JSON.stringify(status);
    });
    return router;
}