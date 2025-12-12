import { Context } from "@oak/oak";
import _ from "npm:lodash";
import { Environment } from "npm:nunjucks";

import { AppState } from "../types/AppState.ts";
import { ScenarioEmbedData } from "../types/EmbedDataTypes.ts";
import { EmbedHandler } from "./EmbedHandler.ts";
import { APIResult } from "../types/ReportingTypes.ts";

const { truncate } = _;

export class ScenarioHandler extends EmbedHandler<ScenarioEmbedData> {
    readonly name = "scenario";
    readonly redirectKeys = ["share", "source", "published", "unlisted"];
    protected readonly responseType = "scenario";
    protected readonly oembedType = "Scenario";

    constructor(env: Environment) {
        super(env, "embed.njk", "embed-notfound.njk");
    }

    fetch(ctx: Context<AppState>, id: string) {
        return ctx.state.api.getScenarioEmbed(id);
    }

    protected prepareContext(ctx: Context<AppState>, data: ScenarioEmbedData, link: string) {
        ctx.state.analytics.content = {
            ...(ctx.state.analytics.content as { status: APIResult, id: string, type: string }),
            title: data.title,
            rating: data.contentRating,
            visibility: data.unlisted ? "Unlisted" : "Published",
            author: {
                id: /* TODO */ "",
                title: data.user.profile.title
            }
        };

        const { links } = ctx.state;
        return {
            type: this.responseType,
            title: data.title,
            author: data.user.profile.title,
            profile_link: `${links.redirectBase}/profile/${data.user.profile.title}`,
            description: truncate(data.description ?? data.prompt ?? "", {
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
