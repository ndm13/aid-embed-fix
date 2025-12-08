import {Context} from "@oak/oak";
import {Environment, Template} from "nunjucks";
import {AIDungeonAPI} from "../api/AIDungeonAPI.ts";
import {oembedLink} from "../utils/rendering.ts";
import {redirectLink} from "../utils/routing.ts";
import log from "../logging/logger.ts";

export abstract class EmbedHandler<T> {
    abstract readonly name: string;
    abstract readonly redirectKeys: string[];

    protected abstract readonly errorType: string;
    protected abstract readonly oembedType: string;

    protected successTemplate: Template;
    protected errorTemplate: Template;

    protected constructor(
        protected api: AIDungeonAPI,
        env: Environment,
        successTemplateFile: string,
        errorTemplateFile: string
    ) {
        this.successTemplate = env.getTemplate(successTemplateFile);
        this.errorTemplate = env.getTemplate(errorTemplateFile);
    }

    abstract fetch(id: string): Promise<T>;

    protected abstract prepareContext(ctx: Context, data: T): object;

    protected getRedirectLink(ctx: Context): string {
        return redirectLink(ctx, this.redirectKeys);
    }

    protected getResourceId(ctx: Context): string {
        return ctx.params.id || "";
    }

    async handle(ctx: Context) {
        ctx.state.metrics.endpoint = this.name;

        const id = this.getResourceId(ctx);
        const link = this.getRedirectLink(ctx);

        ctx.state.redirectLink = link;

        if (tryForward(ctx, link)) return;

        try {
            const data = await this.fetch(id);
            ctx.state.metrics.type = "success";

            ctx.response.body = this.successTemplate.render(
                this.prepareContext(ctx, data)
            );
        } catch (e) {
            ctx.state.metrics.type = "error";
            log.error(`Error getting ${this.name}`, e);

            ctx.response.body = this.errorTemplate.render({
                type: this.errorType,
                id,
                link,
                oembed: oembedLink(ctx, {
                    title: `${(this.errorType.charAt(0).toUpperCase() + this.errorType.slice(1))} Not Found [${id}]`,
                    type: this.oembedType
                })
            });
        }
    }
}

function tryForward(ctx: Context, link: string) {
    if (shouldForward(ctx)) {
        ctx.state.metrics.type = "redirect";
        ctx.response.status = 301;
        ctx.response.redirect(link);
        return true;
    }
    return false;
}

function shouldForward(ctx: Context) {
    // Bypass check with ?no_ua
    if (ctx.request.url.searchParams.has("no_ua"))
        return false;
    // Otherwise check if it's coming from Discordbot
    return ctx.request.userAgent.ua.indexOf("Discordbot") === -1;
}