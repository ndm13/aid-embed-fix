import {Context} from "@oak/oak";

import config from "../config.ts";

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
    if (host.startsWith('alpha.')) return "https://alpha.aidungeon.com";
    return config.client.origin;
}