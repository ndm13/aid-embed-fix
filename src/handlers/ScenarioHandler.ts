import { EmbedHandler } from "./EmbedHandler.ts";
import { ScenarioEmbedData } from "../types/EmbedDataTypes.ts";
import { Context } from "@oak/oak";
import { trimDescription } from "../utils/text.ts";
import type { AppState } from "../types/AppState.ts";

export class ScenarioHandler extends EmbedHandler<ScenarioEmbedData> {
    readonly name = "scenario";
    readonly redirectKeys = ['share', 'source', 'published', 'unlisted'];
    protected readonly responseType = "scenario";
    protected readonly oembedType = "Scenario";

    constructor(env: Environment) {
        super(env, "embed.njk", "embed-notfound.njk");
    }

    fetch(ctx: Context<AppState>, id: string) {
        return ctx.state.api.getScenarioEmbed(id);
    }

    protected prepareContext(ctx: Context<AppState>, data: ScenarioEmbedData) {
        const {redirectLink, links} = ctx.state;
        return {
            type: this.responseType,
            title: data.title,
            author: data.user.profile.title,
            profile_link: `${links.redirectBase}/profile/${data.user.profile.title}`,
            description: trimDescription(data.description ?? data.prompt ?? ""),
            cover: links.cover(data.image),
            link: redirectLink,
            icon: data.user.profile.thumbImageUrl,
            oembed: links.oembed({
                title: data.title,
                author: data.user.profile.title,
                type: this.oembedType
            })
        };
    }
}