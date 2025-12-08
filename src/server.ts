import {Application} from "@oak/oak";

import config from "./config.ts";
import log from "./logging/logger.ts";
import {redirectLinkBase} from "./utils/routing.ts";
import {createRouter} from "./routers/index.ts";

log.info("Setting things up...");

const app = new Application();

// Logging and state
app.use(async (ctx, next) => {
    ctx.state.metrics = {};
    await next();
    if (ctx.state.metrics.endpoint === "healthcheck") {
        log.debug("Served", ctx);
    } else {
        log.info("Served", ctx);
    }
});

// Business logic
const router = await createRouter();
app.use(router.routes(), router.allowedMethods());

// Fallback redirect to AI Dungeon
app.use(ctx => {
    ctx.state.metrics.endpoint = "unsupported";
    ctx.state.metrics.type = "redirect";
    ctx.response.redirect(redirectLinkBase(ctx) + ctx.request.url.pathname);
});

log.info("Listening on", config.network.listen);
await app.listen(config.network.listen);