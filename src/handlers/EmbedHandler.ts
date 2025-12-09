import {Context} from "@oak/oak";
import {Environment, Template} from "nunjucks";
import log from "../logging/logger.ts";
import {AppState} from "../types/AppState.ts";
import {capitalize} from "../utils/text.ts";

export abstract class EmbedHandler<T> {
    abstract readonly name: string;
    abstract readonly redirectKeys: string[];

    protected abstract readonly responseType: string;
    protected abstract readonly oembedType: string;

    protected successTemplate: Template;
    protected errorTemplate: Template;

    protected constructor(
        env: Environment,
        successTemplateFile: string,
        errorTemplateFile: string
    ) {
        this.successTemplate = env.getTemplate(successTemplateFile);
        this.errorTemplate = env.getTemplate(errorTemplateFile);
    }

    abstract fetch(ctx: Context<AppState>, id: string): Promise<T>;

    protected abstract prepareContext(ctx: Context<AppState>, data: T): object;

    protected getRedirectLink(ctx: Context<AppState>): string {
        return ctx.state.links.redirect(this.redirectKeys);
    }

    protected getResourceId(ctx: Context<AppState>): string {
        return ctx.params.id || "";
    }

    async handle(ctx: Context<AppState>) {
        ctx.state.metrics.endpoint = this.name;

        const id = this.getResourceId(ctx);
        const link = this.getRedirectLink(ctx);

        ctx.state.redirectLink = link;

        if (tryForward(ctx, link)) return;

        try {
            const data = await this.fetch(ctx, id);
            ctx.state.metrics.type = "success";
            ctx.response.body = this.successTemplate.render(this.prepareContext(ctx, data));
        } catch (e) {
            ctx.state.metrics.type = "error";
            log.error(`Error getting ${this.name}`, e);

            ctx.response.body = this.errorTemplate.render({
                type: this.responseType,
                id,
                link,
                oembed: ctx.state.links.oembed({
                    title: `${capitalize(this.responseType)} Not Found [${id}]`,
                    type: this.oembedType
                })
            });
        }
    }
}

function tryForward(ctx: Context<AppState>, link: string) {
    if (shouldForward(ctx)) {
        ctx.state.metrics.type = "redirect";
        ctx.response.status = 301;
        ctx.response.redirect(link);
        return true;
    }
    return false;
}

function shouldForward(ctx: Context<AppState>) {
    // Bypass check with ?no_ua
    if (ctx.request.url.searchParams.has("no_ua"))
        return false;
    // Otherwise check if it's coming from Discordbot
    return ctx.request.userAgent.ua.indexOf("Discordbot") === -1;
}