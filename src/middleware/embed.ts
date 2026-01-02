import { Router } from "@oak/oak";
import { Environment, runtime, lib } from "npm:nunjucks";

import { AdventureHandler } from "../handlers/AdventureHandler.ts";
import { DemoHandler } from "../handlers/DemoHandler.ts";
import { OEmbedHandler } from "../handlers/OEmbedHandler.ts";
import { ProfileHandler } from "../handlers/ProfileHandler.ts";
import { ScenarioHandler } from "../handlers/ScenarioHandler.ts";
import { AppState } from "../types/AppState.ts";

export function router(njk: Environment) {
    njk.addFilter('p', function(text: string) {
        return runtime.markSafe(
            lib.escape(text).replaceAll(/\n/gm,'\n    <br>\n    ')
        );
    });
    njk.addFilter('cap', function(text: string, length: number) {
        return text.length <= length ? text : text.substring(0, length - 3).trimEnd() + "...";
    });

    const router = new Router<AppState>();

    router.use(async (ctx, next) => {
        ctx.state.analytics.request.middleware = "embed";
        await next();
    });

    const scenario = new ScenarioHandler(njk);
    router.get("/scenario/:id/:tail", async (ctx) => {
        await scenario.handle(ctx);
    });

    const adventure = new AdventureHandler(njk);
    router.get("/adventure/:id/:tail/:read?", async (ctx) => {
        if (ctx.params.read && ctx.params.read !== "read") {
            const link = ctx.state.links.redirect(adventure.redirectKeys);
            ctx.state.metrics.router.endpoint = "adventure";
            ctx.state.metrics.router.type = "redirect";
            ctx.response.redirect(link);
            return;
        }
        await adventure.handle(ctx);
    });

    const profile = new ProfileHandler(njk);
    router.get("/profile/:username", async (ctx) => {
        await profile.handle(ctx);
    });

    const oembed = new OEmbedHandler();
    router.get("/oembed.json", async (ctx) => {
        await oembed.handle(ctx);
    });

    const demo = new DemoHandler(njk);
    router.get("/", async (ctx) => {
        await demo.handle(ctx);
    });

    return router;
}
