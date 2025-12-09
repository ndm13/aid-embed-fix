import { Router } from "@oak/oak";
import { ScenarioHandler } from "../handlers/ScenarioHandler.ts";
import { AdventureHandler } from "../handlers/AdventureHandler.ts";
import { ProfileHandler } from "../handlers/ProfileHandler.ts";
import { DemoHandler } from "../handlers/DemoHandler.ts";
import { Environment, FileSystemLoader } from "nunjucks";
import type {AppState} from "../types/AppState.ts";

const router = new Router();
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

router.get("/oembed.json", ctx => {
    const {links} = ctx.state as AppState;
    ctx.state.metrics.endpoint = "oembed";
    ctx.state.metrics.type = "static";
    const params = ctx.request.url.searchParams;
    if (!params.has("type")) {
        ctx.response.status = 400;
        return;
    }
    const oembed = {
        provider_name: 'AI Dungeon ' + params.get("type"),
        provider_url: params.get('type') === "Embed Fix" ? "https://github.com/ndm13/aid-embed-fix" : links.redirectBase,
        title: "Embed",
        type: 'rich',
        version: '1.0'
    } as Record<string,string>;

    if (params.get("type") !== "Profile" && params.has('author')) {
        oembed.author_name = params.get("author") as string;
        oembed.author_url = `${links.redirectBase}/profile/${params.get("author")}`;
    }

    ctx.response.headers.set("content-type", "application/json");
    ctx.response.body = JSON.stringify(oembed);
});

const demo = new DemoHandler(njk);
router.get("/", async ctx => {
    await demo.handle(ctx);
});

export default router;