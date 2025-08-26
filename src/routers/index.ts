import {Renderer} from "../Renderer.ts";
import log from "../logging/logger.ts";
import config from "../config.ts";
import {createEmbedRouter} from "./embed.ts";
import {createStaticRouter} from "./static.ts";
import {createMetricsRouter} from "./metrics.ts";
import {Router} from "@oak/oak";
import {AIDungeonAPI} from "../api/AIDungeonAPI.ts";

export function createRouter(api: AIDungeonAPI, renderer: Renderer) {
    const router = new Router();

    // Process metrics first, if enabled
    if (config.metrics.enable !== "none") {
        const metrics = createMetricsRouter();
        router.use(metrics.routes(), metrics.allowedMethods());

        if (config.metrics.key) {
            log.info(`Metrics available at /metrics?key=${config.metrics.key}`);
        } else {
            log.warn("Metrics enabled, but empty key supplied. This may allow unauthorized access to system status.");
            log.info("Metrics available at /metrics");
        }
    } else {
        log.info("Metrics disabled");
    }

    // Standard requests
    const embeds = createEmbedRouter(api, renderer);
    const statics = createStaticRouter(renderer);

    router.use(embeds.routes(), embeds.allowedMethods());
    router.use(statics.routes(), statics.allowedMethods());

    return router;
}