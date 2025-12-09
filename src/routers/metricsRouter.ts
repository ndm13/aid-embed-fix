import {Router} from "@oak/oak";

import type { AppState } from "../types/AppState.ts";

export default function metricsRouter(metrics: Metrics, key?: string) {
    const router = new Router<AppState>();

    router.use(async (ctx, next) => {
        const start = Date.now();
        await next();
        metrics.recordEndpoint(ctx.state.metrics?.endpoint || "unknown", Date.now() - start, ctx.state.metrics?.type || "unknown");
    });

    router.get("/metrics", ctx => {
        ctx.state.metrics.endpoint = "metrics";

        if (key) {
            const params = ctx.request.url.searchParams;
            if (!params.has("key") || params.get("key") !== key) {
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