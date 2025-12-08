import log from "../logging/logger.ts";
import config from "../config.ts";
import embedRouter from "./embedRouter.ts";
import staticRouter from "./staticRouter.ts";
import metricsRouter from "./metricsRouter.ts";
import {Router} from "@oak/oak";

const router = new Router();

// Process metrics first, if enabled
if (config.metrics.enable !== "none") {
    router.use(metricsRouter.routes(), metricsRouter.allowedMethods());

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
router.use(embedRouter.routes(), embedRouter.allowedMethods());
router.use(staticRouter.routes(), staticRouter.allowedMethods());

export default router;