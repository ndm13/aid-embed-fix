import { EmbedHandler } from "./EmbedHandler.ts";
import { UserEmbedData } from "../types/EmbedDataTypes.ts";
import { Context } from "@oak/oak";
import { oembedLink } from "../utils/rendering.ts";

export class ProfileHandler extends EmbedHandler<UserEmbedData> {
    readonly name = "profile";
    readonly redirectKeys = ['contentType', 'share', 'sort'];
    protected readonly errorType = "user";
    protected readonly oembedType = "Profile";

    constructor(api: AIDungeonAPI, env: Environment) {
        super(api, env, "embed-profile.njk", "embed-notfound.njk");
    }

    protected getResourceId(ctx: Context) {
        return ctx.params.username || "";
    }

    fetch(id: string) {
        return this.api.getUserEmbed(id);
    }

    protected prepareContext(ctx: Context, data: UserEmbedData) {
        return {
            title: data.profile.title,
            description: data.profile.description,
            link: ctx.state.redirectLink,
            icon: data.profile.thumbImageUrl,
            oembed: oembedLink(ctx, {
                title: data.profile.title,
                author: data.profile.title,
                type: "Profile"
            })
        };
    }
}