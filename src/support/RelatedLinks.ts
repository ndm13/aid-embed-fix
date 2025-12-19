import { Context } from "@oak/oak";

import { AppState } from "../types/AppState.ts";

export class RelatedLinks {
    constructor(private readonly ctx: Context<AppState>, private readonly config: RelatedLinksConfig) {}

    cover(image: string) {
        const params = this.ctx.request.url.searchParams;

        // Support legacy ?bi=[url] (this will likely be deprecated)
        const betterImage = params.get("bi");
        if (betterImage) return betterImage;

        // New cover param
        const cover = params.get("cover");
        if (cover === "none") return null;
        if (cover && cover.includes(":")) {
            let [service, slug] = cover.split(":");
            // Allow for optional leading slash(es) on cover ID
            slug = slug.replace(/^\/+/, "");
            if (slug.length > 0) {
                if (!slug.includes(".")) {
                    // We'll naively assume .jpg if not specified (usually safe)
                    slug += ".jpg";
                }
                slug = encodeURIComponent(slug);
                switch (service) {
                    case "catbox":
                        return `https://files.catbox.moe/${slug}`;
                    case "imgur":
                        return `https://i.imgur.com/${slug}`;
                }
            }
        }

        try {
            const url = new URL(image);
            const split = url.pathname.split("/");
            const last = split[split.length - 1];
            // Check if the last segment is a UUID
            if (
                /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
                    last.toLowerCase()
                )
            ) {
                return image + "/public";
            }
        } catch {
            // invalid URL, ignore
        }
        return image;
    }

    oembed(params: Record<string, string>) {
        return `${this.config.oembedProtocol}://${this.ctx.request.url.host}/oembed.json?${
            new URLSearchParams(params).toString()
        }`;
    }

    redirect(passKeys: string[]) {
        const linkParams = this.ctx.request.url.searchParams.entries()
            .filter(([k, _]) => passKeys.includes(k))
            .reduce((a, [k, v]) => {
                a.set(k, v);
                return a;
            }, new URLSearchParams());
        return this.redirectBase +
            this.ctx.request.url.pathname +
            (linkParams.size > 0 ? "?" + linkParams.toString() : "");
    }

    get redirectBase() {
        const host = this.ctx.request.url.host;
        if (host.startsWith("play.")) return "https://play.aidungeon.com";
        if (host.startsWith("beta.")) return "https://beta.aidungeon.com";
        if (host.startsWith("alpha.")) return "https://alpha.aidungeon.com";
        return this.config.defaultRedirectBase;
    }
}

export type RelatedLinksConfig = {
    oembedProtocol: string,
    defaultRedirectBase: string
};
