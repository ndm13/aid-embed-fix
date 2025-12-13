import { Application } from "@oak/oak";
import { Environment, FileSystemLoader } from "npm:nunjucks";

import { AIDungeonAPI } from "./api/AIDungeonAPI.ts";
import * as analytics from "./middleware/analytics.ts";
import * as embed from "./middleware/embed.ts";
import * as logging from "./middleware/logging.ts";
import * as metrics from "./middleware/metrics.ts";
import * as statics from "./middleware/statics.ts";
import * as state from "./middleware/state.ts";
import { AnalyticsCollector } from "./support/AnalyticsCollector.ts";
import { MetricsCollector } from "./support/MetricsCollector.ts";
import { AppState } from "./types/AppState.ts";

import config from "./config.ts";
import log from "./logging/logger.ts";

log.info("Setting things up...");
export const app = new Application<AppState>();
const njk = new Environment(new FileSystemLoader("templates"));

const api = await AIDungeonAPI.create({
    gqlEndpoint: config.client.gqlEndpoint,
    userAgent: config.client.userAgent,
    origin: config.client.origin,
    firebase: config.firebase
});
log.info("Using anonymous API access with user agent:", config.client.userAgent);

// Logging and state
app.use(state.middleware(api, {
    oembedProtocol: config.network.oembedProtocol,
    defaultRedirectBase: config.client.origin
}));
app.use(logging.middleware());

// Analytics
if (config.analytics.enable) {
    if (!config.analytics.supabaseUrl || !config.analytics.supabaseKey || !config.analytics.ingestSecret) {
        throw new TypeError("Analytics is enabled, but the Supabase URL, key, or secret is missing.");
    }
    const analyticsCollector = new AnalyticsCollector(api, {
        supabaseUrl: config.analytics.supabaseUrl,
        supabaseKey: config.analytics.supabaseKey,
        ingestSecret: config.analytics.ingestSecret,
        processingInterval: 1000,
        cacheExpiration: 3600000
    });
    app.use(analytics.middleware(analyticsCollector));
    log.info(`Analytics enabled: reporting to ${config.analytics.supabaseUrl}`);
} else {
    log.info("Analytics disabled");
}

// Metrics
if (config.metrics.enable !== "none") {
    const metricsCollector = new MetricsCollector({
        window: 3600000,
        scopes: {
            api: config.metrics.enable === "all" || config.metrics.enable.includes("api"),
            router: config.metrics.enable === "all" || config.metrics.enable.includes("router")
        }
    });
    app.use(metrics.middleware(metricsCollector));
    const router = metrics.router(metricsCollector, config.metrics.key);
    app.use(router.routes(), router.allowedMethods());

    if (config.metrics.key) {
        log.info(
            `Metrics available at ${config.network.oembedProtocol}://${config.network.listen}/metrics?key=${config.metrics.key}`
        );
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
    ctx.state.metrics.router.endpoint = "unsupported";
    ctx.state.metrics.router.type = "redirect";
    ctx.response.redirect(ctx.state.links.redirectBase + ctx.request.url.pathname);
});

if (import.meta.main) {
    log.info("Listening on", config.network.listen);
    await app.listen(config.network.listen);
}
