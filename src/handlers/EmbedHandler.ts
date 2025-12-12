import { Context } from "@oak/oak";
import _ from "npm:lodash";
import { Environment, Template } from "npm:nunjucks";

import { AIDungeonAPIError } from "../api/AIDungeonAPIError.ts";
import { Handler } from "./Handler.ts";
import { AppState } from "../types/AppState.ts";
import { APIResult } from "../types/ReportingTypes.ts";

import log from "../logging/logger.ts";

const { capitalize } = _;

type EmbedContext = Context<AppState, Record<string, any>> & {
    params: {
        id: string
    }
};

export abstract class EmbedHandler<T> implements Handler {
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

    protected abstract prepareContext(ctx: Context<AppState>, data: T, link: string): object;

    protected getRedirectLink(ctx: Context<AppState>): string {
        return ctx.state.links.redirect(this.redirectKeys);
    }

    protected getResourceId(ctx: Context<AppState>): string {
        return (ctx as EmbedContext).params.id || "";
    }

    async handle(ctx: Context<AppState>) {
        ctx.state.metrics.router.endpoint = this.name;

        const id = this.getResourceId(ctx);
        const link = this.getRedirectLink(ctx);

        ctx.state.analytics.content = {
            status: "unknown",
            id,
            type: this.name
        };

        if (tryForward(ctx, link)) return;

        let result: APIResult = "unknown";
        ctx.state.metrics.api = {
            method: `${this.name}_embed`,
            timestamp: Date.now()
        };

        try {
            const data = await this.fetch(ctx, id);
            ctx.state.metrics.api.duration = Date.now() - (ctx.state.metrics.api.timestamp || 0);
            ctx.state.metrics.router.type = "success";
            result = "success";
            ctx.response.body = this.successTemplate.render(this.prepareContext(ctx, data, link));
        } catch (e) {
            ctx.state.metrics.api.duration = Date.now() - (ctx.state.metrics.api.timestamp || 0);
            ctx.state.metrics.router.type = "error";
            if (e instanceof AIDungeonAPIError) {
                if (e.response) result = "api_error";
                else if (e.cause) result = "net_error";
            }
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
        } finally {
            ctx.state.analytics.content!.status = result;
            if (ctx.state.metrics.api) ctx.state.metrics.api.result = result;
        }
    }
}

function tryForward(ctx: Context<AppState>, link: string) {
    if (shouldForward(ctx)) {
        ctx.state.metrics.router.type = "redirect";
        ctx.response.status = 301;
        ctx.response.redirect(link);
        return true;
    }
    return false;
}

function shouldForward(ctx: Context<AppState>) {
    // Bypass check with ?no_ua
    if (ctx.request.url.searchParams.has("no_ua")) {
        return false;
    }
    // Otherwise check if it's coming from Discordbot
    return ctx.request.userAgent.ua.indexOf("Discordbot") === -1;
}
