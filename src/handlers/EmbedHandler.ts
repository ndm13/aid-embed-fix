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

type CacheEntry = {
    data: any;
    id: string;
    type: string;
    visibility?: string;
    timestamp: number;
};

export abstract class EmbedHandler<T> implements Handler {
    protected static previewCache = new Map<string, CacheEntry>();
    protected static readonly CACHE_TTL = 1000 * 60 * 5; // 5 minutes
    protected static readonly MAX_CACHE_SIZE = 100;

    static {
        const timerId = setInterval(() => {
            const now = Date.now();
            for (const [key, entry] of this.previewCache) {
                if (now - entry.timestamp > this.CACHE_TTL) {
                    this.previewCache.delete(key);
                }
            }
        }, this.CACHE_TTL);
        Deno.unrefTimer(timerId);
    }
    
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
        return (ctx as EmbedContext).params.id || "";
    }

    protected async getPreview(ctx: Context<AppState>, id: string, cacheId: string): Promise<T> {
        if (!['scenario', 'adventure', 'profile'].includes(this.responseType))
            return this.fetch(ctx, id);

        const cached = EmbedHandler.previewCache.get(cacheId);

        const isMismatch = cached &&
            (
                cached.id !== id ||
                cached.type !== this.responseType ||
                (cached.visibility === "unlisted" && ctx.request.url.searchParams.has("published")) ||
                (cached.visibility === "published" && ctx.request.url.searchParams.has("unlisted"))
            );

        if (!cached || isMismatch) {
            const data = await this.fetch(ctx, id);

            // Enforce max size (LRU eviction)
            if (EmbedHandler.previewCache.size >= EmbedHandler.MAX_CACHE_SIZE) {
                const oldestKey = EmbedHandler.previewCache.keys().next().value;
                if (oldestKey) EmbedHandler.previewCache.delete(oldestKey);
            }

            EmbedHandler.previewCache.set(cacheId, {
                data,
                id: id,
                type: this.responseType,
                visibility:
                    (data as Record<string, any>).published ? "published" :
                        (data as Record<string, any>).unlisted ? "unlisted" :
                            undefined,
                timestamp: Date.now()
            });
            return data;
        } else {
            // Update last access time and refresh LRU position
            if (Date.now() - cached.timestamp > EmbedHandler.CACHE_TTL) {
                EmbedHandler.previewCache.delete(cacheId);
                return this.getPreview(ctx, id, cacheId);
            }
            EmbedHandler.previewCache.delete(cacheId);
            EmbedHandler.previewCache.set(cacheId, cached);
            cached.timestamp = Date.now();
        }
        return cached.data;
    }

    protected isPreview(ctx: Context<AppState>) {
        return ctx.request.url.searchParams.has("preview") || ctx.state.settings.proxy?.landing === "preview";
    }

    async handle(ctx: Context<AppState>) {
        ctx.state.metrics.router.endpoint = this.name;

        const id = this.getResourceId(ctx);

        Object.assign(ctx.state.analytics.content, {
            id,
            type: this.name
        });

        if (this.tryForward(ctx)) return;

        let result: APIResult = "unknown";
        ctx.state.metrics.api = {
            method: `${this.name}_embed`,
            timestamp: Date.now()
        };

        try {
            const data = this.isPreview(ctx)
                ? await this.getPreview(ctx, id, ctx.request.url.searchParams.get("preview") || "true")
                : await this.fetch(ctx, id);
            ctx.state.metrics.api.duration = Date.now() - (ctx.state.metrics.api.timestamp || 0);
            ctx.state.metrics.router.type = "success";
            result = "success";
            ctx.response.body = this.successTemplate.render(this.prepareContext(ctx, data));
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
                link: this.getRedirectLink(ctx),
                preview: this.isPreview(ctx),
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

    private tryForward(ctx: Context<AppState>) {
        if (this.shouldForward(ctx)) {
            ctx.state.metrics.router.type = "redirect";
            ctx.response.status = 301;
            ctx.response.redirect(this.getRedirectLink(ctx));
            return true;
        }
        return false;
    }

    protected shouldForward(ctx: Context<AppState>) {
        switch (ctx.state.settings.proxy?.landing) {
            case "client":  // Force client-side redirect
            case "preview": // Render preview
                return false;
        }

        // Bypass check with ?no_ua
        if (ctx.request.url.searchParams.has("no_ua")) {
            return false;
        }
        // Always render previews
        if (ctx.request.url.searchParams.has("preview")) {
            return false;
        }
        // Otherwise check if it's coming from Discordbot
        return ctx.request.userAgent.ua.indexOf("Discordbot") === -1;
    }
}
