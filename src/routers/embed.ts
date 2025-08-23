import {Router} from "@oak/oak";
import {Renderer} from "../Renderer.ts";
import { AIDungeonAPI } from "../api/AIDungeonAPI.ts";
import {AIDungeonAPIError} from "../api/AIDungeonAPIError.ts";

import log from "../logger.ts";
import config from "../config.ts";
import {redirectLink, tryForward} from "../utils/router.ts";

export function createEmbedRouter(api: AIDungeonAPI, renderer: Renderer) {
    const router = new Router();

    router.get("/scenario/:id/:tail", async ctx => {
        ctx.state.metrics.endpoint = "scenario";
        const link = redirectLink(ctx, ['share']);
        if (tryForward(ctx, link)) return;

        await api.getScenarioEmbed(ctx.params.id)
            .then(scenario => {
                ctx.state.metrics.type = "success";
                ctx.response.body = renderer.scenario(ctx, scenario, link);
            })
            .catch((e: AIDungeonAPIError) => {
                ctx.state.metrics.type = "error";
                log.error("Error getting scenario", e);
                ctx.response.body = renderer.scenarioNotFound(ctx, ctx.params.id, link);
            });
    });

    router.get("/adventure/:id/:tail/:read?", async ctx => {
        ctx.state.metrics.endpoint = "adventure";
        const link = redirectLink(ctx, ['share']);
        // Hack to get optional static parameters working with path-to-regexp@v6.3.0
        if (ctx.params.read && ctx.params.read !== "read") {
            ctx.state.metrics.type = "redirect";
            ctx.response.redirect(link);
            return;
        }
        if (tryForward(ctx, link)) return;

        await api.getAdventureEmbed(ctx.params.id)
            .then(adventure => {
                ctx.state.metrics.type = "success";
                ctx.response.body = renderer.adventure(ctx, adventure, link);
            })
            .catch((e: AIDungeonAPIError) => {
                ctx.state.metrics.type = "error";
                log.error("Error getting adventure", e);
                ctx.response.body = renderer.adventureNotFound(ctx, ctx.params.id, link);
            });
    });

    router.get("/profile/:username", async ctx => {
        ctx.state.metrics.endpoint = "profile";
        const link = redirectLink(ctx, ['contentType', 'share']);
        if (tryForward(ctx, link)) return;

        await api.getUserEmbed(ctx.params.username)
            .then(user => {
                ctx.state.metrics.type = "success";
                ctx.response.body = renderer.profile(ctx, user, link);
            })
            .catch((e: AIDungeonAPIError) => {
                ctx.state.metrics.type = "error";
                log.error("Error getting profile", e);
                ctx.response.body = renderer.profileNotFound(ctx, ctx.params.username, link);
            });
    });

    router.get("/oembed.json", ctx => {
        ctx.state.metrics.endpoint = "oembed";
        ctx.state.metrics.type = "static";
        const params = ctx.request.url.searchParams;
        if (!params.has("type")) {
            ctx.response.status = 400;
            return;
        }
        const oembed = {
            provider_name: 'AI Dungeon ' + params.get("type"),
            provider_url: params.get('type') === "Embed Fix" ? "https://github.com/ndm13/aid-embed-fix" : config.client.origin,
            title: "Embed",
            type: 'rich',
            version: '1.0'
        } as Record<string,string>;

        if (params.get("type") !== "Profile" && params.has('author')) {
            oembed.author_name = params.get("author") as string;
            oembed.author_url = `${config.client.origin}/profile/${params.get("author")}`;
        }

        ctx.response.headers.set("content-type", "application/json");
        ctx.response.body = JSON.stringify(oembed);
    });

    return router;
}