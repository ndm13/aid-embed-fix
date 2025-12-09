import {Application} from "@oak/oak";

import config from "./config.ts";
import log from "./logging/logger.ts";
import router from "./routers/index.ts";
import {AIDungeonAPI} from "./api/AIDungeonAPI.ts";
import {AppState} from "./types/AppState.ts";

import {RelatedLinks} from "./utils/RelatedLinks.ts";

log.info("Setting things up...");

const api = await AIDungeonAPI.guest();
log.info("Using anonymous API access with user agent:", config.client.userAgent);

const app = new Application<AppState>();

// Logging and state
app.use(async (ctx, next) => {
    ctx.state.api = api;
    ctx.state.metrics = {};
    ctx.state.links = new RelatedLinks(ctx);

    await next();
    if (ctx.state.metrics.endpoint === "healthcheck") {
        log.debug("Served", ctx);
    } else {
        log.info("Served", ctx);
    }
});

// Business logic
app.use(router.routes(), router.allowedMethods());

// Fallback redirect to AI Dungeon
app.use(ctx => {
    ctx.state.metrics.endpoint = "unsupported";
    ctx.state.metrics.type = "redirect";
    ctx.response.redirect(ctx.state.links.redirectBase + ctx.request.url.pathname);
});

log.info("Listening on", config.network.listen);
await app.listen(config.network.listen);