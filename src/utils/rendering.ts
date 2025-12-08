import { Context } from "@oak/oak";
import config from "../config.ts";

export function trimDescription(text: string) {
    const limit = 1000;
    if (text.length < limit) return text;
    const paragraphs = text.split('\n');
    let result = '';
    let p = 0;
    for (; p < paragraphs.length && paragraphs[p].length + result.length < limit; p++)
        result += result === '' ? paragraphs[p] : '\n' + paragraphs[p];
    if (p < paragraphs.length) {
        const sentences = paragraphs[p].split('. ');
        for (let s = 0; s < sentences.length && sentences[s].length + result.length < limit; s++) {
            result += result === '' ? sentences[s] : '. ' + sentences[s];
        }
        result += '...';
    }
    return result;
}

export function getCover(ctx: Context, image: string) {
    const betterImage = ctx.request.url.searchParams.get("bi");
    if (betterImage) return betterImage;
    try {
        const url = new URL(image);
        const split = url.pathname.split("/");
        const last = split[split.length - 1];
        // Check if the last segment is a UUID
        if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(last.toLowerCase())) {
            return image + '/public';
        }
    } catch {
        // invalid URL, ignore
    }
    return image;
}

export function oembedLink(ctx: Context, params: Record<string, string>) {
    return `${config.network.oembedProtocol}://${ctx.request.url.host}/oembed.json?${new URLSearchParams(params).toString()}`
}