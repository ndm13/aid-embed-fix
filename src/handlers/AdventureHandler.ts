import { EmbedHandler } from "./EmbedHandler.ts";
import { AdventureEmbedData } from "../types/EmbedDataTypes.ts";
import { Context } from "@oak/oak";
import { getCover, oembedLink, trimDescription } from "../utils/rendering.ts";
import {redirectLinkBase} from "../utils/routing.ts";

export class AdventureHandler extends EmbedHandler<AdventureEmbedData> {
    readonly name = "adventure";
    readonly redirectKeys = ['share', 'source', 'page', 'size'];

    protected readonly errorType = "adventure";
    protected readonly oembedType = "Adventure";

    constructor(api: AIDungeonAPI, env: Environment) {
        super(api, env, "embed.njk", "embed-notfound.njk");
    }

    fetch(id: string) {
        return this.api.getAdventureEmbed(id);
    }

    protected prepareContext(ctx: Context, data: AdventureEmbedData) {
        return {
            type: "adventure",
            title: data.title,
            author: data.user.profile.title,
            profile_link: `${redirectLinkBase(ctx)}/profile/${data.user.profile.title}`,
            description: trimDescription(data.description ?? ""),
            cover: getCover(ctx, data.image),
            link: ctx.state.redirectLink,
            icon: data.user.profile.thumbImageUrl,
            oembed: oembedLink(ctx, {
                title: data.title,
                author: data.user.profile.title,
                type: "Adventure"
            })
        };
    }
}