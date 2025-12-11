import { Application } from "@oak/oak";
import { Environment, FileSystemLoader } from "npm:nunjucks";

import { AIDungeonAPI } from "./api/AIDungeonAPI.ts";
import * as embed from "./middleware/embed.ts";
import * as logging from "./middleware/logging.ts";
import * as metrics from "./middleware/metrics.ts";
import * as statics from "./middleware/statics.ts";
import * as state from "./middleware/state.ts";
import { MetricsCollector } from "./support/MetricsCollector.ts";
import { AppState } from "./types/AppState.ts";

import config from "./config.ts";
import log from "./logging/logger.ts";

log.info("Setting things up...");
const app = new Application<AppState>();
const njk = new Environment(new FileSystemLoader("templates"));

const collector = config.metrics.enable !== "none" ?
    new MetricsCollector({
        window: 3600000,
        scopes: {
            api: config.metrics.enable === "all" || config.metrics.enable.includes("api"),
            router: config.metrics.enable === "all" || config.metrics.enable.includes("router")
        }
    }) :
    undefined;

const api = await AIDungeonAPI.create({
    gqlEndpoint: config.client.gqlEndpoint,
    userAgent: config.client.userAgent,
    origin: config.client.origin,
    firebase: config.firebase
}, collector);
log.info("Using anonymous API access with user agent:", config.client.userAgent);

// Logging and state
app.use(state.middleware(api, {
    oembedProtocol: config.network.oembedProtocol,
    defaultRedirectBase: config.client.origin
}));
app.use(logging.middleware());

// Metrics
if (collector) {
    app.use(metrics.middleware(collector));
    const router = metrics.router(collector, config.metrics.key);
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
const embedRouter = embed.router(njk);
app.use(embedRouter.routes(), embedRouter.allowedMethods());
const staticsRouter = statics.router();
app.use(staticsRouter.routes(), staticsRouter.allowedMethods());

// Fallback redirect to AI Dungeon
app.use((ctx) => {
    ctx.state.metrics.endpoint = "unsupported";
    ctx.state.metrics.type = "redirect";
    ctx.response.redirect(ctx.state.links.redirectBase + ctx.request.url.pathname);
});

log.info("Listening on", config.network.listen);
await app.listen(config.network.listen);
