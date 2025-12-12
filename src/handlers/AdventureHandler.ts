import { Context } from "@oak/oak";
import _ from "npm:lodash";
import { Environment } from "npm:nunjucks";

import { AppState } from "../types/AppState.ts";
import { AdventureEmbedData } from "../types/EmbedDataTypes.ts";
import { EmbedHandler } from "./EmbedHandler.ts";

const { truncate } = _;

export class AdventureHandler extends EmbedHandler<AdventureEmbedData> {
    readonly name = "adventure";
    readonly redirectKeys = ["share", "source", "page", "size"];
    protected readonly responseType = "adventure";
    protected readonly oembedType = "Adventure";

    constructor(env: Environment) {
        super(env, "embed.njk", "embed-notfound.njk");
    }

    fetch(ctx: Context<AppState>, id: string) {
        return ctx.state.api.getAdventureEmbed(id);
    }

    protected prepareContext(ctx: Context<AppState>, data: AdventureEmbedData, link: string): object {
        ctx.state.analytics.content = {
            id: this.getResourceId(ctx),
            type: this.name,
            title: data.title,
            rating: data.contentRating,
            visibility: data.unlisted ? "Unlisted" : "Published",
            author: {
                id: data.userId,
                title: data.user.profile.title
            }
        };

        const { links } = ctx.state;
        return {
            type: this.responseType,
            title: data.title,
            author: data.user.profile.title,
            profile_link: `${links.redirectBase}/profile/${data.user.profile.title}`,
            description: truncate(data.description ?? "", {
                length: 1000,
                separator: " "
            }),
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
