import { Context } from "@oak/oak";
import _ from "npm:lodash";
import { Environment } from "npm:nunjucks";

import { AppState } from "../types/AppState.ts";
import { ScenarioEmbedData } from "../types/EmbedDataTypes.ts";
import { EmbedHandler } from "./EmbedHandler.ts";
import { contentMapper } from "../support/mappers.ts";

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
        const params = ctx.request.url.searchParams;

        // Follow native Latitude URL parameter processing order
        if (params.has("published") && params.get("published") === "true")
            return ctx.state.api.getScenarioEmbed(id, true);

        if (params.has("unlisted") && params.get("unlisted") === "true")
            return ctx.state.api.getScenarioEmbed(id, false);

        // Older link, try to figure it out
        return ctx.state.api.getScenarioEmbed(id);
    }

    protected override getRedirectLink(ctx: Context<AppState>): string {
        let publishParam = {};
        if (ctx.state.analytics.content?.visibility === "Published") {
            publishParam = { published: "true" };
        } else if (ctx.state.analytics.content?.visibility === "Unlisted") {
            publishParam = { unlisted: "true" };
        }
        return ctx.state.links.redirect(this.redirectKeys, publishParam);
    }

    protected prepareContext(ctx: Context<AppState>, data: ScenarioEmbedData) {
        ctx.state.analytics.content = {
            ...ctx.state.analytics.content,
            ...contentMapper.scenario(data)
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
            link: this.getRedirectLink(ctx),
            icon: data.user.profile.thumbImageUrl,
            oembed: links.oembed({
                title: data.title,
                author: data.user.profile.title,
                type: this.oembedType
            })
        };
    }

    protected override shouldForward(ctx: Context<AppState>): boolean {
        // Force resolution for scenarios missing published/unlisted flag
        // (we need to query regardless, so we may as well render the page)
        if (!ctx.request.url.searchParams.has("published") && !ctx.request.url.searchParams.has("unlisted")) {
            return false;
        }
        return super.shouldForward(ctx);
    }
}
