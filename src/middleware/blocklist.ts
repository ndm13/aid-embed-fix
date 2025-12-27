import { Context } from "@oak/oak";
import { Next } from "@oak/oak/middleware";

import { AppState } from "../types/AppState.ts";

const BLOCKED_PATTERNS = [
    // Script extensions (that will never be used upstream)
    /\.(php\d?|phtml|aspx|jsp|cgi|pl|sh|bash)($|\?)/i,
    // We are not WordPress/Laravel, and neither is AI Dungeon
    /\/wp-(admin|content|includes|json|login)/i,
    /\/vendor\//i,
    /\/laravel\//i,
    // Block common dotfile leaks (it won't find anything, it's just annoying)
    /\/\.(git|env|config|vscode|npmrc|aws)(.[\w-.]*)?($|\/|\?)/
];

export function middleware() {
    return async (ctx: Context<AppState>, next: Next) => {
        if (BLOCKED_PATTERNS.some((pattern) => pattern.test(ctx.request.url.pathname))) {
            ctx.state.analytics.request.middleware = "blocklist";
            ctx.state.metrics.router.endpoint = "blocklist";
            ctx.state.metrics.router.type = "unknown";
            ctx.response.status = 404;
            return;
        }
        await next();
    };
}
