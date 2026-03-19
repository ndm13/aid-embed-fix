import { describe, it } from "@std/testing/bdd";
import { assertEquals, assertStringIncludes } from "@std/assert";
import { superoak } from "superoak";
import { app } from "./setup.ts";

// Allow testing cross-domain boundaries manually
app.proxy = true;

describe("Middleware Integration", () => {
    describe("Blocklist Middleware", () => {
        it("should return 404 for blocked file extensions", async () => {
            const request = await superoak(app);
            await request.get("/test.php").expect(404);
            
            const request2 = await superoak(app);
            await request2.get("/script.bash").expect(404);
        });

        it("should return 404 for blocked paths", async () => {
            const request = await superoak(app);
            await request.get("/wp-admin/login").expect(404);

            const request2 = await superoak(app);
            await request2.get("/.env").expect(404);
        });

        it("should allow unblocked paths to fall through to the final redirect", async () => {
            const request = await superoak(app);
            const res = await request.get("/discover").redirects(0).expect(302);
            assertStringIncludes(res.header.location as string, "/discover");
        });
    });

    describe("Statics Middleware", () => {
        it("should return 200 OK for /healthcheck", async () => {
            const request = await superoak(app);
            const res = await request.get("/healthcheck").expect(200);
            assertEquals(res.text, "ok");
        });

        it("should serve static files for exact matches", async () => {
            const request = await superoak(app);
            const res = await request.get("/style.css").expect(200);
            assertStringIncludes(res.text, "html {");
            
            const request2 = await superoak(app);
            const res2 = await request2.get("/robots.txt").expect(200);
            assertStringIncludes(res2.text, "User-agent:");
        });
    });

    describe("Dashboard Middleware", () => {
        it("should redirect /dashboard to /dashboard/", async () => {
            const request = await superoak(app);
            const res = await request.get("/dashboard").redirects(0).expect(302);
            assertEquals(res.header.location, "/dashboard/");
        });

        it("should correctly serve exact files in the dashboard directory", async () => {
            const request = await superoak(app);
            const res = await request.get("/dashboard/index.html").expect(200);
            assertStringIncludes(res.text, "<html");
        });
    });

    describe("Settings Middleware", () => {
        it("should redirect initiator to target domain on /sync", async () => {
            const request = await superoak(app);
            const res = await request.get("/sync")
                .set("X-Forwarded-Host", "aidungeon.link")
                .redirects(0)
                .expect(302);
            
            const location = new URL(res.header.location as string);
            assertEquals(location.hostname, "axdungeon.com");
            assertEquals(location.searchParams.has("token"), true);
        });

        it("should return 400 for invalid initiator domain", async () => {
            const request = await superoak(app);
            await request.get("/sync")
                .set("X-Forwarded-Host", "invalid.com")
                .expect(400);
        });
        
        it("should reject invalid sync token natively on the receiver end", async () => {
            const request = await superoak(app);
            const res = await request.get("/sync?token=invalid-token")
                .set("X-Forwarded-Host", "aidungeon.link")
                .expect(200);
                
            assertStringIncludes(res.text, "window.close()");
        });

        it("should map settings payload from cookies to ctx.state natively", async () => {
            const proxySettings = encodeURIComponent(JSON.stringify({ landing: "preview" }));
            const linkSettings = encodeURIComponent(JSON.stringify({ theme: "dark" }));

            const request = await superoak(app);
            
            const res = await request.get("/sync")
                .set("X-Forwarded-Host", "aidungeon.link")
                .set("Cookie", `proxy_settings=${proxySettings}; link_settings=${linkSettings}`)
                .redirects(0)
                .expect(302);

            const location = new URL(res.header.location as string);
            const token = location.searchParams.get("token");

            // Verify mapping Receiver (Target domain)
            const request2 = await superoak(app);
            const res2 = await request2.get(`/sync?token=${token}`)
                .set("X-Forwarded-Host", "axdungeon.com")
                .expect(200);

            assertStringIncludes(res2.text, "Sync complete");
            
            const setCookieHeader = res2.header["set-cookie"];
            const cookieStr = Array.isArray(setCookieHeader) ? setCookieHeader.join(";") : setCookieHeader as string;
            assertStringIncludes(cookieStr, "proxy_settings=");
            assertStringIncludes(cookieStr, "link_settings=");
        });

        it("should silently ignore malformed JSON in cookie settings", async () => {
            const request = await superoak(app);
            
            // This will hit the fallback redirect because /discover implies no valid router matched. This executes the middleware with invalid cookies.
            await request.get("/discover")
                .set("Cookie", `proxy_settings=invalid-json; link_settings=invalid-json`)
                .redirects(0)
                .expect(302);
        });

        it("should return 403 on receiver if the target host domain is forbidden", async () => {
            const request = await superoak(app);
            const res = await request.get("/sync")
                .set("X-Forwarded-Host", "aidungeon.link")
                .redirects(0)
                .expect(302);
            
            const token = new URL(res.header.location as string).searchParams.get("token");

            const reqReceiver = await superoak(app);
            await reqReceiver.get(`/sync?token=${token}`)
                .set("X-Forwarded-Host", "evil.com")
                .expect(403);
        });

        it("should respect scope=link and scope=proxy correctly capturing targeted boundaries", async () => {
            const proxySettings = encodeURIComponent(JSON.stringify({ landing: "preview" }));
            const linkSettings = encodeURIComponent(JSON.stringify({ theme: "dark" }));

            // Scope: link
            const requestLink = await superoak(app);
            const resLink = await requestLink.get("/sync?scope=link")
                .set("X-Forwarded-Host", "aidungeon.link")
                .set("Cookie", `proxy_settings=${proxySettings}; link_settings=${linkSettings}`)
                .redirects(0)
                .expect(302);
            
            const tokenLink = new URL(resLink.header.location as string).searchParams.get("token");

            const reqLinkReceiver = await superoak(app);
            const resLinkReceiver = await reqLinkReceiver.get(`/sync?token=${tokenLink}`)
                .set("X-Forwarded-Host", "axdungeon.com")
                .expect(200);

            const cookieStrLink = Array.isArray(resLinkReceiver.header["set-cookie"]) 
                ? resLinkReceiver.header["set-cookie"].join(";") 
                : resLinkReceiver.header["set-cookie"] as string;
            
            assertStringIncludes(cookieStrLink, "link_settings=");
            assertEquals(cookieStrLink.includes("proxy_settings="), false);
            
            // Scope: proxy
            const requestProxy = await superoak(app);
            const resProxy = await requestProxy.get("/sync?scope=proxy")
                .set("X-Forwarded-Host", "aidungeon.link")
                .set("Cookie", `proxy_settings=${proxySettings}; link_settings=${linkSettings}`)
                .redirects(0)
                .expect(302);
            
            const tokenProxy = new URL(resProxy.header.location as string).searchParams.get("token");

            const reqProxyReceiver = await superoak(app);
            const resProxyReceiver = await reqProxyReceiver.get(`/sync?token=${tokenProxy}`)
                .set("X-Forwarded-Host", "axdungeon.com")
                .expect(200);

            const cookieStrProxy = Array.isArray(resProxyReceiver.header["set-cookie"]) 
                ? resProxyReceiver.header["set-cookie"].join(";") 
                : resProxyReceiver.header["set-cookie"] as string;
                
            assertStringIncludes(cookieStrProxy, "proxy_settings=");
            assertEquals(cookieStrProxy.includes("link_settings="), false);
        });
    });
});
