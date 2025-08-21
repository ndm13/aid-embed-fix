import {Context} from "@oak/oak";
import {config} from "./config.ts";

export function tryForward(ctx: Context, link: string) {
    if (shouldForward(ctx)) {
        ctx.response.status = 301;
        ctx.response.redirect(link);
        return true;
    }
    return false;
}

export function shouldForward(ctx: Context) {
    // Bypass check with ?no_ua
    if (ctx.request.url.searchParams.has("no_ua"))
        return false;
    // Otherwise check if it's coming from Discordbot
    return ctx.request.userAgent.ua.indexOf("Discordbot") === -1;
}

export function redirectLink(ctx: Context, passKeys: string[]) {
    const linkParams = ctx.request.url.searchParams.entries()
        .filter(([k, _]) => passKeys.includes(k))
        .reduce((a, [k, v]) => {
            a.set(k, v);
            return a;
        }, new URLSearchParams());
    return redirectLinkBase(ctx) +
        ctx.request.url.pathname +
        (linkParams.size > 0 ? '?' + linkParams.toString() : '');
}

export function redirectLinkBase(ctx: Context) {
    const host = ctx.request.url.host;
    if (host.startsWith('play.')) return "https://play.aidungeon.com";
    if (host.startsWith('beta.')) return "https://beta.aidungeon.com";
    return config.client.origin;
}