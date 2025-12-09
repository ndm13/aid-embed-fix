import { EmbedHandler } from "./EmbedHandler.ts";
import { AdventureEmbedData } from "../types/EmbedDataTypes.ts";
import { Context } from "@oak/oak";
import { trimDescription } from "../utils/text.ts";
import type { AppState } from "../types/AppState.ts";

export class AdventureHandler extends EmbedHandler<AdventureEmbedData> {
    readonly name = "adventure";
    readonly redirectKeys = ['share', 'source', 'page', 'size'];
    protected readonly responseType = "adventure";
    protected readonly oembedType = "Adventure";

    constructor(env: Environment) {
        super(env, "embed.njk", "embed-notfound.njk");
    }

    fetch(ctx: Context<AppState>, id: string) {
        return ctx.state.api.getAdventureEmbed(id);
    }

    protected prepareContext(ctx: Context<AppState>, data: AdventureEmbedData, link: string): object {
        const {links} = ctx.state;
        return {
            type: this.responseType,
            title: data.title,
            author: data.user.profile.title,
            profile_link: `${links.redirectBase}/profile/${data.user.profile.title}`,
            description: trimDescription(data.description ?? ""),
            cover: links.cover(data.image),
            link,
            icon: data.user.profile.thumbImageUrl,
            oembed: links.oembed({
                title: data.title,
                author: data.user.profile.title,
                type: this.oembedType
            })
        };
    }
}