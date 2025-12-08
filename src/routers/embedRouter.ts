import { Router } from "@oak/oak";
import {redirectLink} from "../utils/routing.ts";
import { ScenarioHandler } from "../handlers/ScenarioHandler.ts";
import { AdventureHandler } from "../handlers/AdventureHandler.ts";
import { ProfileHandler } from "../handlers/ProfileHandler.ts";
import {AIDungeonAPI} from "../api/AIDungeonAPI.ts";
import log from "../logging/logger.ts";
import config from "../config.ts";
import {DemoHandler} from "../handlers/DemoHandler.ts";
import {Environment, FileSystemLoader} from "nunjucks";

export default async function embedRouter() {
    const api = await AIDungeonAPI.guest();
    log.info("Using anonymous API access with user agent:", config.client.userAgent);

    const njk = new Environment(new FileSystemLoader('templates'));

    const router = new Router();

    const scenario = new ScenarioHandler(api, njk);
    router.get("/scenario/:id/:tail", async ctx => {
        await scenario.handle(ctx);
    });

    const adventure = new AdventureHandler(api, njk);
    router.get("/adventure/:id/:tail/:read?", async ctx => {
        // The edge case logic remains here as it is specific to routing, not handling
        if (ctx.params.read && ctx.params.read !== "read") {
            const link = redirectLink(ctx, adventure.redirectKeys);
            ctx.state.metrics.endpoint = "adventure";
            ctx.state.metrics.type = "redirect";
            ctx.response.redirect(link);
            return;
        }
        await adventure.handle(ctx);
    });

    const profile = new ProfileHandler(api, njk);
    router.get("/profile/:username", async ctx => {
        await profile.handle(ctx);
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

    const demo = new DemoHandler(api, njk);
    router.get("/", async ctx => {
        await demo.handle(ctx);
    });

    return router;
}