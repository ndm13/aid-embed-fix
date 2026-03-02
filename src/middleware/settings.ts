import { Context, Router } from "@oak/oak";
import { Next } from "@oak/oak/middleware";
import { AppState } from "../types/AppState.ts";

const ALLOWED_DOMAINS = ["aidungeon.link", "axdungeon.com"];
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

interface SyncToken {
    link?: string;
    proxy?: string;
    timestamp: number;
}

const syncTokens = new Map<string, SyncToken>();

// Clean up expired tokens every minute
const timer = setInterval(() => {
    const now = Date.now();
    for (const [token, data] of syncTokens) {
        if (now - data.timestamp > 60000) { // 1 minute expiration
            syncTokens.delete(token);
        }
    }
}, 60000);
Deno.unrefTimer(timer);

function getBaseDomain(hostname: string): string | null {
    for (const domain of ALLOWED_DOMAINS) {
        if (hostname === domain || hostname.endsWith("." + domain)) {
            return domain;
        }
    }
    return null;
}

export function middleware() {
    return async (ctx: Context<AppState>, next: Next) => {
        // Populate settings from cookies
        const linkCookie = await ctx.cookies.get("link_settings");
        const proxyCookie = await ctx.cookies.get("proxy_settings");

        ctx.state.settings = {};
        if (linkCookie) {
            try {
                ctx.state.settings.link = JSON.parse(decodeURIComponent(linkCookie));
            } catch {
                // ignore
            }
        }
        if (proxyCookie) {
            try {
                ctx.state.settings.proxy = JSON.parse(decodeURIComponent(proxyCookie));
            } catch {
                // ignore
            }
        }

        await next();
    };
}

export function router() {
    const router = new Router<AppState>();

    router.get("/sync", async (ctx) => {
        const token = ctx.request.url.searchParams.get("token");
        const mode = ctx.request.url.searchParams.get("mode");
        const scope = ctx.request.url.searchParams.get("scope") || "all";

        // Receiver (Has token)
        if (token) {
            const data = syncTokens.get(token);
            if (!data) {
                if (mode === "popup") {
                    ctx.response.body = `
                        <!DOCTYPE html>
                        <html><body><script>
                            window.close();
                        </script></body></html>
                    `;
                    return;
                }
                ctx.response.status = 400;
                ctx.response.body = "Invalid or expired sync token";
                return;
            }

            // Invalidate token immediately
            syncTokens.delete(token);

            const currentHost = ctx.request.url.hostname;
            const baseDomain = getBaseDomain(currentHost);

            if (!baseDomain) {
                ctx.response.status = 403;
                ctx.response.body = "Forbidden domain";
                return;
            }

            // Set cookies
            const cookieDomain = "." + baseDomain;

            if (data.link) {
                await ctx.cookies.set("link_settings", data.link, {
                    httpOnly: false,
                    maxAge: COOKIE_MAX_AGE,
                    path: "/",
                    sameSite: "lax",
                    domain: cookieDomain
                });
            }

            if (data.proxy) {
                await ctx.cookies.set("proxy_settings", data.proxy, {
                    httpOnly: false,
                    maxAge: COOKIE_MAX_AGE,
                    path: "/",
                    sameSite: "lax",
                    domain: cookieDomain
                });
            }

            if (mode === "popup") {
                ctx.response.body = `
                    <!DOCTYPE html>
                    <html>
                    <body>
                    <script>
                        if (window.opener) {
                            window.opener.postMessage({ type: 'sync_complete', success: true }, '*');
                            window.close();
                        } else {
                            window.location.href = '/';
                        }
                    </script>
                    <p>Sync complete. You can close this window.</p>
                    </body>
                    </html>
                `;
                return;
            }

            ctx.response.redirect("/");
            return;
        }

        // Initiator (No token)
        const currentHost = ctx.request.url.hostname;
        const currentBase = getBaseDomain(currentHost);

        if (!currentBase) {
            ctx.response.status = 400;
            ctx.response.body = "Invalid domain for sync";
            return;
        }

        const targetBase = ALLOWED_DOMAINS.find(d => d !== currentBase);
        if (!targetBase) {
            ctx.response.status = 500;
            ctx.response.body = "Target domain not found";
            return;
        }

        // Read cookies based on scope
        let linkCookie: string | undefined;
        let proxyCookie: string | undefined;

        if (scope === "all" || scope === "link") {
            linkCookie = await ctx.cookies.get("link_settings");
        }
        if (scope === "all" || scope === "proxy") {
            proxyCookie = await ctx.cookies.get("proxy_settings");
        }

        // Generate Token
        const newToken = crypto.randomUUID();
        syncTokens.set(newToken, {
            link: linkCookie ? decodeURIComponent(linkCookie) : undefined,
            proxy: proxyCookie ? decodeURIComponent(proxyCookie) : undefined,
            timestamp: Date.now()
        });

        // Construct Target URL
        const prefix = currentHost.slice(0, -currentBase.length);
        const targetHost = prefix + targetBase;

        const targetUrl = new URL("https://" + targetHost + "/sync");
        targetUrl.searchParams.set("token", newToken);
        if (mode) {
            targetUrl.searchParams.set("mode", mode);
        }

        ctx.response.redirect(targetUrl);
    });

    return router;
}
