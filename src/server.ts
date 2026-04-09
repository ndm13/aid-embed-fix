import { Application } from "@oak/oak";
import { Environment } from "npm:nunjucks";

import { AIDungeonAPI } from "./api/AIDungeonAPI.ts";
import * as analytics from "./middleware/analytics.ts";
import * as blocklist from "./middleware/blocklist.ts";
import * as embed from "./middleware/embed.ts";
import * as dashboard from "./middleware/dashboard.ts";
import * as logging from "./middleware/logging.ts";
import * as metrics from "./middleware/metrics.ts";
import * as statics from "./middleware/statics.ts";
import * as state from "./middleware/state.ts";
import * as settings from "./middleware/settings.ts";
import { AnalyticsCollector } from "./support/AnalyticsCollector.ts";
import { MetricsCollector } from "./support/MetricsCollector.ts";
import { AppState } from "./types/AppState.ts";

import defaultConfig from "./config.ts";
import log from "./logging/logger.ts";

export interface AppDeps {
    api: AIDungeonAPI;
    analyticsCollector?: AnalyticsCollector;
    metricsCollector?: MetricsCollector;
    config: {
        oembedProtocol: string;
        redirectBase: string;
        metricsKey?: string;
    };
}

export function buildApp(deps: AppDeps) {
    const app = new Application<AppState>();
    const njk = new Environment({
        getSource(name: string) {
            try {
                const templatePath = new URL(`../templates/${name}`, import.meta.url);
                return {
                    src: Deno.readTextFileSync(templatePath),
                    path: templatePath.href,
                    noCache: false
                };
            } catch (_e) {
                return null as any;
            }
        }
    });

    // Logging and state
    app.use(state.middleware(deps.api, {
        oembedProtocol: deps.config.oembedProtocol,
        defaultRedirectBase: deps.config.redirectBase
    }));
    app.use(logging.middleware());

    // Analytics
    if (deps.analyticsCollector) {
        app.use(analytics.middleware(deps.analyticsCollector));
    }

    // Metrics
    if (deps.metricsCollector) {
        app.use(metrics.middleware(deps.metricsCollector));
        const router = metrics.router(deps.metricsCollector, deps.config.metricsKey);
        app.use(router.routes(), router.allowedMethods());
    }

    // Settings
    app.use(settings.middleware());
    const settingsRouter = settings.router();
    app.use(settingsRouter.routes(), settingsRouter.allowedMethods());

    // Dashboard
    app.use(dashboard.middleware());

    // Business logic
    const embedRouter = embed.router(njk);
    app.use(embedRouter.routes(), embedRouter.allowedMethods());
    const staticsRouter = statics.router();
    app.use(staticsRouter.routes(), staticsRouter.allowedMethods());

    // Block spam requests
    app.use(blocklist.middleware());

    // Fallback redirect to AI Dungeon
    app.use((ctx) => {
        ctx.state.analytics.request.middleware = "redirect";
        ctx.state.metrics.router.endpoint = "unsupported";
        ctx.state.metrics.router.type = "redirect";
        ctx.response.redirect(ctx.state.links.redirectBase + ctx.request.url.pathname);
    });

    return app;
}

if (import.meta.main) {
    log.info("Setting things up...");
    const config = defaultConfig;
    const abortController = new AbortController();

    const api = await AIDungeonAPI.create({
        gqlEndpoint: config.client.gqlEndpoint,
        userAgent: config.client.userAgent,
        origin: config.client.origin,
        firebase: config.firebase
    });
    log.info("Using anonymous API access with user agent:", config.client.userAgent);

    let analyticsCollector: AnalyticsCollector | undefined;
    if (config.analytics.enable) {
        if (!config.analytics.supabaseUrl || !config.analytics.supabaseKey || !config.analytics.ingestSecret) {
            log.warn("Analytics is enabled, but the Supabase URL, key, or secret is missing. Analytics will be disabled.");
        } else {
            try {
                analyticsCollector = await AnalyticsCollector.create(api, {
                    supabaseUrl: config.analytics.supabaseUrl,
                    supabaseKey: config.analytics.supabaseKey,
                    ingestSecret: config.analytics.ingestSecret,
                    processingInterval: 300000, // 5 minutes
                    cacheExpiration: 3600000 // 1 hour
                });
                log.info(`Analytics enabled: reporting to ${config.analytics.supabaseUrl}`);
            } catch (error) {
                log.error("Failed to initialize analytics, continuing with analytics disabled.");
                log.error(error);
            }
        }
    } else {
        log.info("Analytics disabled");
    }

    let metricsCollector: MetricsCollector | undefined;
    if (config.metrics.enable !== "none") {
        metricsCollector = new MetricsCollector({
            window: 3600000, // 1 hour
            scopes: {
                api: config.metrics.enable === "all" || config.metrics.enable.includes("api"),
                router: config.metrics.enable === "all" || config.metrics.enable.includes("router")
            }
        });
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

    const app = buildApp({
        api,
        analyticsCollector,
        metricsCollector,
        config: {
            oembedProtocol: config.network.oembedProtocol,
            redirectBase: config.client.origin,
            metricsKey: config.metrics.key
        }
    });

    const shutdown = async () => {
        log.info("Waiting for server to shut down...");
        abortController.abort();
        if (analyticsCollector) {
            log.info("Flushing analytics cache...");
            await analyticsCollector.cleanup();
        }
        Deno.exit();
    };

    Deno.addSignalListener("SIGINT", shutdown);
    if (Deno.build.os !== "windows") {
        Deno.addSignalListener("SIGTERM", shutdown);
    }
    
    log.info("Listening on", config.network.listen);
    await app.listen({
        hostname: config.network.listen.split(":")[0],
        port: parseInt(config.network.listen.split(":")[1]),
        signal: abortController.signal
    });
}
