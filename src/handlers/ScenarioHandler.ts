import { EmbedHandler } from "./EmbedHandler.ts";
import { ScenarioEmbedData } from "../types/EmbedDataTypes.ts";
import { Context } from "@oak/oak";
import { getCover, oembedLink, trimDescription } from "../utils/rendering.ts";
import {redirectLinkBase} from "../utils/routing.ts";

export class ScenarioHandler extends EmbedHandler<ScenarioEmbedData> {
    readonly name = "scenario";
    readonly redirectKeys = ['share', 'source', 'published', 'unlisted'];
    protected readonly errorType = "scenario";
    protected readonly oembedType = "Scenario";

    constructor(api: AIDungeonAPI, env: Environment) {
        super(api, env, "embed.njk", "embed-notfound.njk");
    }

    fetch(id: string) {
        return this.api.getScenarioEmbed(id);
    }

    protected prepareContext(ctx: Context, data: ScenarioEmbedData) {
        return {
            type: "scenario",
            title: data.title,
            author: data.user.profile.title,
            profile_link: `${redirectLinkBase(ctx)}/profile/${data.user.profile.title}`,
            description: trimDescription(data.description ?? data.prompt ?? ""),
            cover: getCover(ctx, data.image),
            link: ctx.state.redirectLink,
            icon: data.user.profile.thumbImageUrl,
            oembed: oembedLink(ctx, {
                title: data.title,
                author: data.user.profile.title,
                type: "Scenario"
            })
        };
    }
}