import {Application, Context, Router} from "@oak/oak";
import { Environment, FileSystemLoader } from "nunjucks";

import {AIDungeonAPI} from "./AIDungeonAPI.ts";
import {config} from "./config.ts";

const api = await AIDungeonAPI.guest();
console.log("Using anonymous API access with user agent:", config.client.userAgent);

const router = new Router();
const njk = new Environment(new FileSystemLoader('templates'));

// Naïve attempt to get descriptions to ~500 characters.
// Discord does its own trimming so we don't need to be strict.
function trimDescription(text: string) {
    if (text.length < 500) return text;
    const parts = text.split('\n');
    text = '';
    let i = 0;
    for (; i < parts.length && parts[i].length + text.length < 500; i++)
        text += '\n' + parts[i];
    if (i < parts.length)
        text += '\n...';
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

router.get("/scenario/:id/:tail", async ctx => {
    const link = getRedirectBase(ctx) + ctx.request.url.pathname;
    if (shouldForwardInstead(ctx)) {
        ctx.response.status = 301;
        ctx.response.redirect(link);
        return;
    }

    const scenario = await api.getScenario(ctx.params.id);
    if (!scenario) {
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
    if (!adventure) {
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
    if (!user) {
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
    await ctx.send({
        root: './static'
    });
});

router.get("/", ctx => {
    ctx.response.status = 301;
    ctx.response.redirect("https://github.com/ndm13/aid-embed-fix");
});

const app = new Application();
// Logging
app.use(async (ctx, next) => {
    await next();
    console.log(ctx.response.status, ctx.request.method, ctx.request.url.pathname, ctx.request.userAgent.ua);
});

// Router
app.use(router.routes());
app.use(router.allowedMethods());

// All other requests can bounce to AI Dungeon, in case someone proxied an unsupported link
app.use(ctx => {
    // 302 is fine for this, in case we support it later
    ctx.response.redirect(getRedirectBase(ctx) + "/" + ctx.request.url.pathname);
});

console.log("Listening on", config.network.listen);
await app.listen(config.network.listen);