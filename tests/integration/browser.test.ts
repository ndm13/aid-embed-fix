import { describe, it } from "@std/testing/bdd";
import { assertEquals, assertStringIncludes } from "@std/assert";
import { superoak } from "superoak";
import { app, createBrowserRequest, parseMetaTags } from "./setup.ts";

describe("Browser User-Agent Integration", () => {
    it("should return 301 and redirect to the frontend application for Scenarios", async () => {
        const request = await superoak(app);
        const res = await createBrowserRequest(request.get("/scenario/found-published/test-tail?published=true").redirects(0))
            .expect(301);
            
        assertEquals(res.header.location, "https://mock.aidungeon.com/scenario/found-published/test-tail?published=true");
    });

    it("should return 301 and redirect to the frontend application for Adventures", async () => {
        const request = await superoak(app);
        const res = await createBrowserRequest(request.get("/adventure/found-published/test-tail").redirects(0))
            .expect(301);
            
        assertEquals(res.header.location, "https://mock.aidungeon.com/adventure/found-published/test-tail");
    });
    
    it("should return 301 and redirect to the frontend application for Profiles", async () => {
        const request = await superoak(app);
        const res = await createBrowserRequest(request.get("/profile/testuser").redirects(0))
            .expect(301);
            
        assertEquals(res.header.location, "https://mock.aidungeon.com/profile/testuser");
    });

    it("should return 301 and redirect to the GitHub repository for the Demo root route", async () => {
        const request = await superoak(app);
        const res = await createBrowserRequest(request.get("/").redirects(0))
            .expect(301);
            
        assertEquals(res.header.location, "https://github.com/ndm13/aid-embed-fix");
    });

    it("should bypass the crawler redirect and return a 200 embed when ?no_ua is appended", async () => {
        const request = await superoak(app);
        const res = await createBrowserRequest(request.get("/scenario/found-published/test-tail?no_ua=true"))
            .expect(200);

        const meta = parseMetaTags(res.text);
        assertStringIncludes(meta["og:title"], "Test Scenario");
    });

});
