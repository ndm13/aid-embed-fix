import {Application} from "@oak/oak";
import {Environment, FileSystemLoader} from "nunjucks";

import {AIDungeonAPI} from "./AIDungeonAPI.ts";
import {Renderer} from "./Renderer.ts";

import config from "./config.ts";
import log from "./logger.ts";
import {redirectLinkBase} from "./utils/router.ts";
import {createRouter} from "./routers/index.ts";

log.info("Setting things up...");

const api = await AIDungeonAPI.guest();
log.info("Using anonymous API access with user agent:", config.client.userAgent);

const app = new Application();

// Logging
app.use(async (ctx, next) => {
    await next();
    log.info("Served", ctx);
});

// Business logic
const renderer = new Renderer(new Environment(new FileSystemLoader('templates')));
const router = createRouter(api, renderer);
app.use(router.routes(), router.allowedMethods());

// Fallback redirect to AI Dungeon
app.use(ctx => {
    ctx.state.metrics.endpoint = "unsupported";
    ctx.state.metrics.type = "redirect";
    ctx.response.redirect(redirectLinkBase(ctx) + ctx.request.url.pathname);
});

log.info("Listening on", config.network.listen);
await app.listen(config.network.listen);