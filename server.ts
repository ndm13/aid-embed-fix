import {Application, Context, Router} from "@oak/oak";
import { Environment, FileSystemLoader } from "nunjucks";

import {AIDungeonAPI} from "./AIDungeonAPI.ts";
import {config} from "./config.ts";

const api = await AIDungeonAPI.guest();
console.log("Using anonymous API access with user agent:", config.client.userAgent);

const router = new Router();
const njk = new Environment(new FileSystemLoader('templates'));

// Naïve attempt to get descriptions to ~1000 characters.
// Discord does its own trimming so we don't need to be strict.
function trimDescription(text: string) {
    const limit = 1000;
    if (text.length < limit) return text;
    const paragraphs = text.split('\n');
    text = '';
    let p = 0;
    for (; p < paragraphs.length && paragraphs[p].length + text.length < limit; p++)
        text += text === '' ? paragraphs[p] : '\n' + paragraphs[p];
    if (p < paragraphs.length) {
        // We can trim the remaining paragraph by sentences if we have room
        const sentences = paragraphs[p].split('. ');
        for (let s = 0; s < sentences.length && sentences[s].length + text.length < limit; s++) {
            text += text === '' ? sentences[s] : '. ' + sentences[s];
        }
        text += '...';
    }
    return text;
}

function shouldForwardInstead(ctx: Context) {
    // Bypass check with ?no_ua
    if (ctx.request.url.searchParams.has("no_ua"))
        return false;
    // Otherwise check if it's coming from Discordbot
    return ctx.request.userAgent.ua.indexOf("Discordbot") === -1;
}

function getRedirectBase(ctx: Context) {
    const host = ctx.request.url.host;
    if (host.startsWith('play.')) return "https://play.aidungeon.com";
    if (host.startsWith('beta.')) return "https://beta.aidungeon.com";
    return config.client.origin;
}

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
    const link = getRedirectBase(ctx) + ctx.request.url.pathname;
    if (shouldForwardInstead(ctx)) {
        ctx.response.status = 301;
        ctx.response.redirect(link);
        return;
    }

    const scenario = await api.getScenario(ctx.params.id);
    if (error.length > 99) error.shift();
    if (!scenario) {
        error.push(1);
        const oembedParams = new URLSearchParams({
            title: `Scenario Not Found [${ctx.params.id}]`,
            type: "Scenario"
        }).toString();

        ctx.response.body = njk.render('embed-notfound.njk', {
            type: "scenario",
            id: ctx.params.id,
            link,
            oembed: `${config.network.oembedProtocol}://${ctx.request.url.host}/oembed.json?${oembedParams}`
        });
    } else {
        error.push(0);
        const oembedParams = new URLSearchParams({
            title: scenario.title,
            author: scenario.user.profile.title,
            type: "Scenario"
        }).toString();

        ctx.response.body = njk.render('embed.njk', {
            type: "scenario",
            title: scenario.title,
            author: scenario.user.profile.title,
            profile_link: `${config.client.origin}/profile/${scenario.user.profile.title}`,
            description: trimDescription(scenario.description ?? scenario.prompt),
            cover: ctx.request.url.searchParams.get("bi") ?? `${scenario.image}/public`,
            link,
            icon: scenario.user.profile.thumbImageUrl,
            oembed: `${config.network.oembedProtocol}://${ctx.request.url.host}/oembed.json?${oembedParams}`
        });
    }
});

router.get("/adventure/:id/:tail/:read?", async ctx => {
    last.adventure = Date.now();
    const link = getRedirectBase(ctx) + ctx.request.url.pathname;
    // Hack to get optional static parameters working with path-to-regexp@v6.3.0
    if (ctx.params.read && ctx.params.read !== "read") {
        ctx.response.status = 302;
        ctx.response.redirect(link);
    }
    if (shouldForwardInstead(ctx)) {
        ctx.response.status = 301;
        ctx.response.redirect(link);
        return;
    }

    const adventure = await api.getAdventure(ctx.params.id);
    if (error.length > 99) error.shift();
    if (!adventure) {
        error.push(1);
        const oembedParams = new URLSearchParams({
            title: `Adventure Not Found [${ctx.params.id}]`,
            type: "Adventure"
        }).toString();

        ctx.response.body = njk.render('embed-notfound.njk', {
            type: "adventure",
            id: ctx.params.id,
            link,
            oembed: `${config.network.oembedProtocol}://${ctx.request.url.host}/oembed.json?${oembedParams}`
        });
    } else {
        error.push(0);
        const oembedParams = new URLSearchParams({
            title: adventure.title,
            author: adventure.user.profile.title,
            type: "Adventure"
        }).toString();

        ctx.response.body = njk.render('embed.njk', {
            type: "adventure",
            title: adventure.title,
            author: adventure.user.profile.title,
            profile_link: `${config.client.origin}/profile/${adventure.user.profile.title}`,
            description: trimDescription(adventure.description),
            cover: ctx.request.url.searchParams.get("bi") ?? `${adventure.image}/public`,
            link,
            icon: adventure.user.profile.thumbImageUrl,
            oembed: `${config.network.oembedProtocol}://${ctx.request.url.host}/oembed.json?${oembedParams}`
        });
    }
});

router.get("/profile/:username", async ctx => {
    last.profile = Date.now();
    let link = getRedirectBase(ctx) + ctx.request.url.pathname;
    // Preserve selected profile tab on redirect
    if (ctx.request.url.searchParams.has("contentType")) {
        link += "?contentType=" + ctx.request.url.searchParams.get("contentType");
    }
    if (shouldForwardInstead(ctx)) {
        ctx.response.status = 301;
        ctx.response.redirect(link);
        return;
    }

    const user = await api.getUser(ctx.params.username);
    if (error.length > 99) error.shift();
    if (!user) {
        error.push(1);
        const oembedParams = new URLSearchParams({
            title: `User Not Found [${ctx.params.username}]`,
            type: "Profile"
        }).toString();

        ctx.response.body = njk.render('embed-notfound.njk', {
            type: "user",
            id: ctx.params.username,
            link,
            oembed: `${config.network.oembedProtocol}://${ctx.request.url.host}/oembed.json?${oembedParams}`
        });
    } else {
        error.push(0);
        const oembedParams = new URLSearchParams({
            title: user.profile.title,
            author: user.profile.title,
            type: "Profile"
        }).toString();

        ctx.response.body = njk.render('embed-profile.njk', {
            title: user.profile.title,
            description: user.profile.description,
            link,
            icon: user.profile.thumbImageUrl,
            oembed: `${config.network.oembedProtocol}://${ctx.request.url.host}/oembed.json?${oembedParams}`
        });
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
        provider_url: config.client.origin,
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
    ctx.response.status = 301;
    ctx.response.redirect("https://github.com/ndm13/aid-embed-fix");
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
    ctx.response.redirect(getRedirectBase(ctx) + ctx.request.url.pathname);
});

console.log("Listening on", config.network.listen);
await app.listen(config.network.listen);