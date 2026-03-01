import { Context } from "@oak/oak";
import { Environment } from "npm:nunjucks";

import { AppState } from "../types/AppState.ts";
import { UserEmbedData } from "../types/EmbedDataTypes.ts";
import { EmbedHandler } from "./EmbedHandler.ts";
import { contentMapper } from "../support/mappers.ts";

type ProfileContext = Context<AppState, Record<string, any>> & {
    params: {
        username: string
    }
};

export class ProfileHandler extends EmbedHandler<UserEmbedData> {
    readonly name = "profile";
    readonly redirectKeys = ["contentType", "share", "sort"];
    protected readonly responseType = "user";
    protected readonly oembedType = "Profile";

    constructor(env: Environment) {
        super(env, "embed-profile.njk", "embed-notfound.njk");
    }

    protected override getResourceId(ctx: Context<AppState>) {
        return (ctx as ProfileContext).params.username!;
    }

    fetch(ctx: Context<AppState>, id: string) {
        return ctx.state.api.getUserEmbed(id);
    }

    protected prepareContext(ctx: Context<AppState>, data: UserEmbedData): object {
        Object.assign(ctx.state.analytics.content, contentMapper.user(data));

        return {
            title: data.profile.title,
            description: data.profile.description,
            link: this.getRedirectLink(ctx),
            icon: data.profile.thumbImageUrl,
            oembed: ctx.state.links.oembed({
                title: data.profile.title,
                author: data.profile.title,
                type: this.oembedType
            })
        };
    }
}
