import {Application} from "@oak/oak";

import config from "./config.ts";
import log from "./logging/logger.ts";
import {AIDungeonAPI} from "./api/AIDungeonAPI.ts";
import type {AppState} from "./types/AppState.ts";

import {RelatedLinks} from "./support/RelatedLinks.ts";
import {Metrics} from "./support/Metrics.ts";
import {metricsMiddleware, metricsRouter} from "./middleware/metrics.ts";
import embedRouter from "./middleware/embedRouter.ts";
import staticRouter from "./middleware/staticRouter.ts";

log.info("Setting things up...");

const metrics = config.metrics.enable !== "none" ? new Metrics({
    window: 3600000,
    scopes: {
        api: config.metrics.enable === "all" || config.metrics.enable.includes("api"),
        router: config.metrics.enable === "all" || config.metrics.enable.includes("router")
    }
}) : null;

const api = await AIDungeonAPI.create({
    gqlEndpoint: config.client.gqlEndpoint,
    userAgent: config.client.userAgent,
    origin: config.client.origin,
    firebase: config.firebase
}, metrics);
log.info("Using anonymous API access with user agent:", config.client.userAgent);

const app = new Application<AppState>();

// Logging and state
app.use(async (ctx, next) => {
    ctx.state = {
        api,
        metrics: {},
        links: new RelatedLinks(ctx, {
            oembedProtocol: config.network.oembedProtocol,
            defaultRedirectBase: config.client.origin
        })
    };
    await next();
    if (ctx.state.metrics.endpoint === "healthcheck") {
        log.debug("Served", ctx);
    } else {
        log.info("Served", ctx);
    }
});

// Metrics
if (metrics) {
    app.use(metricsMiddleware(metrics));
    const router = metricsRouter(metrics, config.metrics.key);
    app.use(router.routes(), router.allowedMethods());

    if (config.metrics.key) {
        log.info(`Metrics available at /metrics?key=${config.metrics.key}`);
    } else {
        log.warn("Metrics enabled, but empty key supplied. This may allow unauthorized access to system status.");
        log.info("Metrics available at /metrics");
    }
} else {
    log.info("Metrics disabled");
}

// Business logic
app.use(embedRouter.routes(), embedRouter.allowedMethods());
app.use(staticRouter.routes(), staticRouter.allowedMethods());

// Fallback redirect to AI Dungeon
app.use(ctx => {
    ctx.state.metrics.endpoint = "unsupported";
    ctx.state.metrics.type = "redirect";
    ctx.response.redirect(ctx.state.links.redirectBase + ctx.request.url.pathname);
});

log.info("Listening on", config.network.listen);
await app.listen(config.network.listen);