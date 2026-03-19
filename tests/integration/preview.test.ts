import { describe, it } from "@std/testing/bdd";
import { assertEquals, assertStringIncludes } from "@std/assert";
import { superoak } from "superoak";
import { app, createDiscordRequest, fetchGraphQLCalls, resetFetchCalls } from "./setup.ts";

describe("Preview Cache Integration", () => {
    it("should embed window.location.replace script for standard unflagged requests", async () => {
        resetFetchCalls();
        const request = await superoak(app);
        const res = await createDiscordRequest(request.get("/scenario/found-published/test-tail"))
            .expect(200);

        assertStringIncludes(res.text, "window.location.replace(");
    });

    it("should omit window.location.replace script when ?preview is explicitly appended", async () => {
        resetFetchCalls();
        const request = await superoak(app);
        const res = await createDiscordRequest(request.get("/scenario/found-published/test-tail?preview=true"))
            .expect(200);

        assertEquals(res.text.includes("window.location.replace("), false);
    });

    it("should natively cache duplicate requests utilizing the identical preview override ID", async () => {
        resetFetchCalls();
        
        // Initial Fetch
        const requestA = await superoak(app);
        await createDiscordRequest(requestA.get("/scenario/found-published/test-tail?preview=test-cache-key"))
            .expect(200);
            
        assertEquals(fetchGraphQLCalls.length, 1);
        
        // Duplicate Fetch
        const requestB = await superoak(app);
        await createDiscordRequest(requestB.get("/scenario/found-published/test-tail?preview=test-cache-key&cover=none"))
            .expect(200);
            
        // Should securely skip external resolution payload
        assertEquals(fetchGraphQLCalls.length, 1);
    });
    
    it("should organically evict cache boundaries if requested parameters invoke a visibility mismatch", async () => {
        resetFetchCalls();
        
        // Initial Cache Hit utilizing Published Payload
        const requestA = await superoak(app);
        await createDiscordRequest(requestA.get("/scenario/found-published/test-tail?preview=mismatch-cache"))
            .expect(200);
            
        assertEquals(fetchGraphQLCalls.length, 1);
        
        // Mismatch Fetch forcing external eviction query (Published cached -> requested Unlisted property)
        const requestB = await superoak(app);
        await createDiscordRequest(requestB.get("/scenario/found-unlisted/test-tail?unlisted=true&preview=mismatch-cache"))
            .expect(200);
            
        // Validated evasion triggers additional GraphQL array query
        assertEquals(fetchGraphQLCalls.length, 2);
    });
    it("should render preview and omit redirect when proxy_settings cookie matches 'preview'", async () => {
        resetFetchCalls();
        const request = await superoak(app);
        const proxySettings = encodeURIComponent(JSON.stringify({ landing: "preview" }));
        
        const res = await createDiscordRequest(
            request.get("/scenario/found-published/test-tail")
            .set("Cookie", `proxy_settings=${proxySettings}`)
        ).expect(200);

        assertEquals(res.text.includes("window.location.replace("), false);
    });
});
