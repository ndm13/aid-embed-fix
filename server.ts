import {Application, Router} from "@oak/oak";
import {Environment, FileSystemLoader} from "nunjucks";

import {AIDungeonAPI} from "./AIDungeonAPI.ts";
import {config} from "./config.ts";
import Renderer from "./Renderer.ts";
import * as RouterUtils from "./router_utils.ts";

const api = await AIDungeonAPI.guest();
console.log("Using anonymous API access with user agent:", config.client.userAgent);

const router = new Router();
const renderer = new Renderer(new Environment(new FileSystemLoader('templates')));

const last = {
    healthcheck: 0,
    scenario: 0,
    adventure: 0,
    profile: 0,
    oembed: 0,
    static: 0,
    root: 0,
    other: 0
};
const error: number[] = [];

router.get("/healthcheck", ctx => {
    const status = {
        api: {
            last: {
                request: api.lastRequestAt ? new Date(api.lastRequestAt) : null,
                refresh: api.lastRefreshAt ? new Date(api.lastRefreshAt) : null
            },
            tokenValid: !api.isExpired
        },
        server: {
            last: Object.fromEntries(Object.entries(last).map(([k,v]) => [k, v ? new Date(v) : null])),
            errorRate: (a => a.reduce((a, c) => a + c, 0) / error.length)(error || [0])
        }
    };
    last.healthcheck = Date.now();
    ctx.response.status = status.server.errorRate > 0.5 ? 503 : 200;
    ctx.response.type = "application/json";
    ctx.response.body = JSON.stringify(status);
});

router.get("/scenario/:id/:tail", async ctx => {
    last.scenario = Date.now();
    const link = RouterUtils.redirectLink(ctx, ['share']);
    if (RouterUtils.tryForward(ctx, link)) return;

    const scenario = await api.getScenario(ctx.params.id);
    if (error.length > 99) error.shift();
    if (!scenario) {
        error.push(1);
        ctx.response.body = renderer.scenarioNotFound(ctx, ctx.params.id, link);
    } else {
        error.push(0);
        ctx.response.body = renderer.scenario(ctx, scenario, link);
    }
});

router.get("/adventure/:id/:tail/:read?", async ctx => {
    last.adventure = Date.now();
    const link = RouterUtils.redirectLink(ctx, ['share']);
    // Hack to get optional static parameters working with path-to-regexp@v6.3.0
    if (ctx.params.read && ctx.params.read !== "read") {
        ctx.response.redirect(link);
        return;
    }
    if (RouterUtils.tryForward(ctx, link)) return;

    const adventure = await api.getAdventure(ctx.params.id);
    if (error.length > 99) error.shift();
    if (!adventure) {
        error.push(1);
        ctx.response.body = renderer.adventureNotFound(ctx, ctx.params.id, link);
    } else {
        error.push(0);
        ctx.response.body = renderer.adventure(ctx, adventure, link);
    }
});

router.get("/profile/:username", async ctx => {
    last.profile = Date.now();
    const link = RouterUtils.redirectLink(ctx, ['contentType', 'share']);
    if (RouterUtils.tryForward(ctx, link)) return;

    const user = await api.getUser(ctx.params.username);
    if (error.length > 99) error.shift();
    if (!user) {
        error.push(1);
        ctx.response.body = renderer.profileNotFound(ctx, ctx.params.username, link);
    } else {
        error.push(0);
        ctx.response.body = renderer.profile(ctx, user, link);
    }
});

router.get("/oembed.json", ctx => {
    last.oembed = Date.now();
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
    last.static = Date.now();
    await ctx.send({
        root: './static'
    });
});

router.get("/", ctx => {
    last.root = Date.now();
    const link = "https://github.com/ndm13/aid-embed-fix";
    if (RouterUtils.tryForward(ctx, link)) return;
    // Otherwise generate embed demo
    ctx.response.body = renderer.demo(ctx, link);
});

const app = new Application();
// Logging
app.use(async (ctx, next) => {
    await next();
    console.log(
        ctx.response.status,
        ctx.request.method,
        `${ctx.request.url.pathname}${ctx.request.url.search}`,
        ctx.request.userAgent.ua
    );
});

// Router
app.use(router.routes());
app.use(router.allowedMethods());

// All other requests can bounce to AI Dungeon, in case someone proxied an unsupported link
app.use(ctx => {
    last.other = Date.now();
    // 302 is fine for this, in case we support it later
    ctx.response.redirect(RouterUtils.redirectLinkBase(ctx) + ctx.request.url.pathname);
});

console.log("Listening on", config.network.listen);
await app.listen(config.network.listen);