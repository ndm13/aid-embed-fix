import { Context, Router } from "@oak/oak";
import { Next } from "@oak/oak/middleware";

import { MetricsCollector } from "../support/MetricsCollector.ts";
import { AppState } from "../types/AppState.ts";

export function middleware(metrics: MetricsCollector) {
    return async (ctx: Context<AppState>, next: Next) => {
        const start = Date.now();
        await next();
        metrics.recordEndpoint(
            ctx.state.metrics?.endpoint || "unknown",
            Date.now() - start,
            ctx.state.metrics?.type || "unknown"
        );
    };
}

export function router(metrics: MetricsCollector, key?: string) {
    const router = new Router<AppState>();

    router.get("/metrics", (ctx) => {
        ctx.state.metrics.endpoint = "metrics";

        if (key) {
            const params = ctx.request.url.searchParams;
            if (!params.has("key") || params.get("key") !== key) {
                ctx.state.metrics.type = "error";
                ctx.response.status = 401;
                ctx.response.type = "application/json";
                ctx.response.body = {
                    error: {
                        details:
                            "Incorrect or missing metrics key. If using the default config, a key has been generated for you and will be in the log."
                    }
                };
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
