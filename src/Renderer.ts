import {Context} from "@oak/oak";
import {Environment} from "nunjucks";

import config from "./config.ts";

import {AdventureEmbedData, ScenarioEmbedData, UserEmbedData} from "./types/EmbedDataTypes.ts";

// Naïve attempt to get descriptions to ~1000 characters.
// Discord does its own trimming so we don't need to be strict.
function trimDescription(text: string) {
    const limit = 1000;
    if (text.length < limit) return text;
    const paragraphs = text.split('\n');
    text = '';
    let p = 0;
    for (; p < paragraphs.length && paragraphs[p].length + text.length < limit; p++)
        text += text === '' ? paragraphs[p] : '\n' + paragraphs[p];
    if (p < paragraphs.length) {
        // We can trim the remaining paragraph by sentences if we have room
        const sentences = paragraphs[p].split('. ');
        for (let s = 0; s < sentences.length && sentences[s].length + text.length < limit; s++) {
            text += text === '' ? sentences[s] : '. ' + sentences[s];
        }
        text += '...';
    }
    return text;
}

export class Renderer {
    private _njk: Environment;

    constructor(nunjucks: Environment) {
        this._njk = nunjucks;
    }

    scenarioNotFound(ctx: Context, id: string, link: string) {
        return this._njk.render('embed-notfound.njk', {
            type: "scenario",
            id,
            link,
            oembed: Renderer.oembedLink(ctx, {
                title: `Scenario Not Found [${id}]`,
                type: "Scenario"
            })
        });
    }

    adventureNotFound(ctx: Context, id: string, link: string) {
        return this._njk.render('embed-notfound.njk', {
            type: "adventure",
            id: id,
            link,
            oembed: Renderer.oembedLink(ctx, {
                title: `Adventure Not Found [${id}]`,
                type: "Adventure"
            })
        });
    }

    profileNotFound(ctx: Context, username: string, link: string) {
        return this._njk.render('embed-notfound.njk', {
            type: "user",
            id: username,
            link,
            oembed: Renderer.oembedLink(ctx, {
                title: `User Not Found [${username}]`,
                type: "Profile"
            })
        });
    }

    scenario(ctx: Context, scenario: ScenarioEmbedData, link: string) {
        return this._njk.render('embed.njk', {
            type: "scenario",
            title: scenario.title,
            author: scenario.user.profile.title,
            profile_link: `${config.client.origin}/profile/${scenario.user.profile.title}`,
            description: trimDescription(scenario.description ?? scenario.prompt ?? ""),
            cover: ctx.request.url.searchParams.get("bi") ??
                        scenario.image.endsWith('.png') ? scenario.image : `${scenario.image}/public`,
            link,
            icon: scenario.user.profile.thumbImageUrl,
            oembed: Renderer.oembedLink(ctx, {
                title: scenario.title,
                author: scenario.user.profile.title,
                type: "Scenario"
            })
        });
    }

    adventure(ctx: Context, adventure: AdventureEmbedData, link: string) {
        return this._njk.render('embed.njk', {
            type: "adventure",
            title: adventure.title,
            author: adventure.user.profile.title,
            profile_link: `${config.client.origin}/profile/${adventure.user.profile.title}`,
            description: trimDescription(adventure.description ?? ""),
            cover: ctx.request.url.searchParams.get("bi") ??
                        adventure.image.endsWith('.png') ? adventure.image :  `${adventure.image}/public`,
            link,
            icon: adventure.user.profile.thumbImageUrl,
            oembed: Renderer.oembedLink(ctx, {
                title: adventure.title,
                author: adventure.user.profile.title,
                type: "Adventure"
            })
        });
    }

    profile(ctx: Context, user: UserEmbedData, link: string) {
        return this._njk.render('embed-profile.njk', {
            title: user.profile.title,
            description: user.profile.description,
            link,
            icon: user.profile.thumbImageUrl,
            oembed: Renderer.oembedLink(ctx, {
                title: user.profile.title,
                author: user.profile.title,
                type: "Profile"
            })
        });
    }

    demo(ctx: Context, link: string) {
        return this._njk.render("demo.njk", {
            title: "Fix AI Dungeon Link Previews!",
            author: "ndm13",
            description: `Get more details in your AI Dungeon links!
 • Change .com to .link, or
 • Post a link and type s/i/x!

Now you can see the link type, description, and image!

Fully open source, click the link for details!`,
            cover: 'https://github.com/ndm13/aid-embed-fix/blob/main/screenshots/sixfix_demo.gif?raw=true',
            link,
            oembed: Renderer.oembedLink(ctx, {
                title: "Fix AI Dungeon Link Previews!",
                type: "Embed Fix"
            })
        });
    }

    static oembedLink(ctx: Context, params: Record<string, string>) {
        return `${config.network.oembedProtocol}://${ctx.request.url.host}/oembed.json?${new URLSearchParams(params).toString()}`
    }
}