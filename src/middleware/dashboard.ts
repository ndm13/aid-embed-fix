import { Context, send } from "@oak/oak";
import { Next } from "@oak/oak/middleware";
import { AppState } from "../types/AppState.ts";

const root = "./static/dashboard";
const ALLOWED_DOMAINS = ["aidungeon.link", "axdungeon.com"];

export function middleware() {
    return async (ctx: Context<AppState>, next: Next) => {
        if (ctx.request.url.searchParams.has("preview")) return await next();
        
        // Handle Sync
        if (ctx.request.url.pathname === "/sync") {
            const referer = ctx.request.headers.get("referer");
            if (!referer) {
                ctx.response.status = 400;
                ctx.response.body = "Missing referer";
                return;
            }

            try {
                const refererUrl = new URL(referer);
                const refererDomain = refererUrl.hostname;
                const targetDomain = ctx.request.url.hostname;

                // Verify both domains are allowed and different
                const isAllowedReferer = ALLOWED_DOMAINS.some(d => refererDomain.endsWith(d));
                const isAllowedTarget = ALLOWED_DOMAINS.some(d => targetDomain.endsWith(d));

                if (!isAllowedReferer || !isAllowedTarget) {
                    ctx.response.status = 403;
                    ctx.response.body = "Forbidden domain";
                    return;
                }

                // Get settings from query params
                const syncLink = ctx.request.url.searchParams.get("sync_link");
                const syncProxy = ctx.request.url.searchParams.get("sync_proxy");

                if (!syncLink && !syncProxy) {
                    ctx.response.status = 400;
                    ctx.response.body = "No settings to sync";
                    return;
                }

                // Set cookies on the target domain
                const maxAge = 60 * 60 * 24 * 365; // 1 year
                const domainParts = targetDomain.split('.');
                const cookieDomain = domainParts.length > 1 && !targetDomain.match(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/)
                    ? '.' + domainParts.slice(-2).join('.')
                    : targetDomain;

                if (syncLink) {
                    await ctx.cookies.set("link_settings", syncLink, {
                        httpOnly: false, // Needs to be accessible by JS
                        maxAge,
                        path: "/",
                        sameSite: "lax",
                        domain: cookieDomain
                    });
                }

                if (syncProxy) {
                    await ctx.cookies.set("proxy_settings", syncProxy, {
                        httpOnly: false, // Needs to be accessible by JS
                        maxAge,
                        path: "/",
                        sameSite: "lax",
                        domain: cookieDomain
                    });
                }

                // Redirect back to the dashboard on the target domain
                ctx.response.redirect("/");
                return;

            } catch (e) {
                ctx.response.status = 400;
                ctx.response.body = "Invalid request";
                return;
            }
        }

        if (ctx.request.url.pathname === "/dashboard") {
            ctx.response.redirect("/dashboard/");
            return;
        }

        if (ctx.request.url.hostname.startsWith("my.") || ctx.request.url.pathname.startsWith("/dashboard/")) {
            ctx.state.analytics.request.middleware = "dashboard";
            ctx.state.metrics.router.endpoint = "dashboard";
            ctx.state.metrics.router.type = "static";

            try {
                await send(ctx, ctx.request.url.pathname.replace(/^(\/dashboard\/)?/, "/"), {
                    root,
                    index: "index.html"
                });
            } catch {
                if (ctx.request.accepts("html")) {
                    try {
                        await send(ctx, "index.html", { root });
                    } catch {
                        ctx.response.status = 404;
                        ctx.response.body = "Dashboard build not found.";
                    }
                } else {
                    ctx.response.status = 404;
                }
            }
            return;
        }
        await next();
    };
}
