import {Application, Router} from "@oak/oak";
import {Environment, FileSystemLoader} from "nunjucks";

import {AIDungeonAPI} from "./AIDungeonAPI.ts";
import {config} from "./config.ts";
import Renderer from "./Renderer.ts";
import {redirectLink, redirectLinkBase, tryForward} from "./utils/router.ts";
import {AIDungeonAPIError} from "./AIDungeonAPIError.ts";
import log from "./logger.ts";
import metrics from "./metrics.ts";

const api = await AIDungeonAPI.guest();
log.info("Using anonymous API access with user agent:", config.client.userAgent);

const router = new Router();
const renderer = new Renderer(new Environment(new FileSystemLoader('templates')));

router.get("/healthcheck", ctx => {
    ctx.state.metrics.endpoint = "healthcheck";
    ctx.state.metrics.type = "static";
    const status = {
        api: metrics.api,
        router: metrics.router,
        window: metrics.window
    };
    ctx.response.type = "application/json";
    ctx.response.body = JSON.stringify(status);
});

router.get("/scenario/:id/:tail", async ctx => {
    ctx.state.metrics.endpoint = "scenario";
    const link = redirectLink(ctx, ['share']);
    if (tryForward(ctx, link)) return;

    await api.getScenarioEmbed(ctx.params.id)
        .then(scenario => {
            ctx.state.metrics.type = "success";
            ctx.response.body = renderer.scenario(ctx, scenario, link);
        })
        .catch((e: AIDungeonAPIError) => {
            ctx.state.metrics.type = "error";
            log.error("Error getting scenario", e);
            ctx.response.body = renderer.scenarioNotFound(ctx, ctx.params.id, link);
        });
});

router.get("/adventure/:id/:tail/:read?", async ctx => {
    ctx.state.metrics.endpoint = "adventure";
    const link = redirectLink(ctx, ['share']);
    // Hack to get optional static parameters working with path-to-regexp@v6.3.0
    if (ctx.params.read && ctx.params.read !== "read") {
        ctx.state.metrics.type = "redirect";
        ctx.response.redirect(link);
        return;
    }
    if (tryForward(ctx, link)) return;

    await api.getAdventureEmbed(ctx.params.id)
        .then(adventure => {
            ctx.state.metrics.type = "success";
            ctx.response.body = renderer.adventure(ctx, adventure, link);
        })
        .catch((e: AIDungeonAPIError) => {
            ctx.state.metrics.type = "error";
            log.error("Error getting adventure", e);
            ctx.response.body = renderer.adventureNotFound(ctx, ctx.params.id, link);
        });
});

router.get("/profile/:username", async ctx => {
    ctx.state.metrics.endpoint = "profile";
    const link = redirectLink(ctx, ['contentType', 'share']);
    if (tryForward(ctx, link)) return;

    await api.getUserEmbed(ctx.params.username)
        .then(user => {
            ctx.state.metrics.type = "success";
            ctx.response.body = renderer.profile(ctx, user, link);
        })
        .catch((e: AIDungeonAPIError) => {
            ctx.state.metrics.type = "error";
            log.error("Error getting profile", e);
            ctx.response.body = renderer.profileNotFound(ctx, ctx.params.username, link);
        });
});

router.get("/oembed.json", ctx => {
    ctx.state.metrics.endpoint = "oembed";
    ctx.state.metrics.type = "static";
    const params = ctx.request.url.searchParams;
    if (!params.has("type")) {
        ctx.response.status = 400;
        return;
    }
    const oembed = {
        provider_name: 'AI Dungeon ' + params.get("type"),
        provider_url: params.get('type') === "Embed Fix" ? "https://github.com/ndm13/aid-embed-fix" : config.client.origin,
        title: "Embed",
        type: 'rich',
        version: '1.0'
    } as Record<string,string>;

    if (params.get("type") !== "Profile" && params.has('author')) {
        oembed.author_name = params.get("author") as string;
        oembed.author_url = `${config.client.origin}/profile/${params.get("author")}`;
    }

    ctx.response.headers.set("content-type", "application/json");
    ctx.response.body = JSON.stringify(oembed);
});

router.get("/(style.css|robots.txt)", async ctx => {
    ctx.state.metrics.endpoint = "static";
    ctx.state.metrics.type = "static";
    await ctx.send({
        root: './static'
    });
});

router.get("/", ctx => {
    ctx.state.metrics.endpoint = "root";
    const link = "https://github.com/ndm13/aid-embed-fix";
    if (tryForward(ctx, link)) return;
    // Otherwise generate embed demo
    ctx.state.metrics.type = "static";
    ctx.response.body = renderer.demo(ctx, link);
});

const app = new Application();
// Metrics
app.use(async (ctx, next) => {
    const start = Date.now();
    ctx.state.metrics = {};
    await next();
    metrics.recordEndpoint(ctx.state.metrics?.endpoint || "unknown", Date.now() - start, ctx.state.metrics?.type || "unknown");
});
// Logging
app.use(async (ctx, next) => {
    await next();
    log.info("Served", ctx);
});

// Router
app.use(router.routes());
app.use(router.allowedMethods());

// All other requests can bounce to AI Dungeon, in case someone proxied an unsupported link
app.use(ctx => {
    ctx.state.metrics.endpoint = "unsupported";
    ctx.state.metrics.type = "redirect";
    // 302 is fine for this, in case we support it later
    ctx.response.redirect(redirectLinkBase(ctx) + ctx.request.url.pathname);
});

log.info("Listening on", config.network.listen);
await app.listen(config.network.listen);