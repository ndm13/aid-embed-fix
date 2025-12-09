import { Router } from "@oak/oak";
import { ScenarioHandler } from "../handlers/ScenarioHandler.ts";
import { AdventureHandler } from "../handlers/AdventureHandler.ts";
import { ProfileHandler } from "../handlers/ProfileHandler.ts";
import { DemoHandler } from "../handlers/DemoHandler.ts";
import { Environment, FileSystemLoader } from "nunjucks";
import type { AppState } from "../types/AppState.ts";
import {OEmbedHandler} from "../handlers/OEmbedHandler.ts";

const router = new Router<AppState>();
const njk = new Environment(new FileSystemLoader('templates'));

const scenario = new ScenarioHandler(njk);
router.get("/scenario/:id/:tail", async ctx => {
    await scenario.handle(ctx);
});

const adventure = new AdventureHandler(njk);
router.get("/adventure/:id/:tail/:read?", async ctx => {
    if (ctx.params.read && ctx.params.read !== "read") {
        const link = ctx.state.links.redirect(adventure.redirectKeys);
        ctx.state.metrics.endpoint = "adventure";
        ctx.state.metrics.type = "redirect";
        ctx.response.redirect(link);
        return;
    }
    await adventure.handle(ctx);
});

const profile = new ProfileHandler(njk);
router.get("/profile/:username", async ctx => {
    await profile.handle(ctx);
});

const oembed = new OEmbedHandler();
router.get("/oembed.json", async ctx => {
    await oembed.handle(ctx);
});

const demo = new DemoHandler(njk);
router.get("/", async ctx => {
    await demo.handle(ctx);
});

export default router;