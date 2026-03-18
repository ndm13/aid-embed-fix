// tests/integration/setup.ts

import { mockGraphQLResponse } from "./mockData.ts";

export const fetchGraphQLCalls: any[] = [];
export function resetFetchCalls() {
    fetchGraphQLCalls.length = 0;
}

// Mock fetch before importing the server
const originalFetch = globalThis.fetch;
globalThis.fetch = async (input: string | URL | Request, init?: RequestInit) => {
    const urlStr = input instanceof Request ? input.url : input.toString();
    const url = new URL(urlStr);
    
    if (
        (url.hostname === "identitytoolkit.googleapis.com" && url.pathname === "/v1/accounts:signUp") || 
        (url.hostname === "securetoken.googleapis.com" && url.pathname === "/v1/token")
    ) {
        return new Response(JSON.stringify({
            idToken: "mock-id-token",
            refreshToken: "mock-refresh-token",
            expiresIn: "3600",
            localId: "mock-local-id"
        }), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    
    if (url.pathname.endsWith("/graphql")) {
        const bodyStr = init?.body?.toString();
        if (bodyStr) {
            const parsed = JSON.parse(bodyStr);
            fetchGraphQLCalls.push(parsed);
            
            if (parsed.variables?.shortId === "server-error") {
                return new Response(JSON.stringify({ errors: [{ message: "Internal Server Error" }] }), { status: 500, headers: { "Content-Type": "application/json" } });
            }

            return new Response(JSON.stringify(mockGraphQLResponse(parsed)), { 
                status: 200,
                headers: { "Content-Type": "application/json" }
            });
        }
    }

    if (["127.0.0.1", "localhost", "0.0.0.0"].includes(url.hostname)) {
        return originalFetch(input, init);
    }
    throw new Error(`Unexpected external request to ${urlStr}`);
};

// Now import the app
const { app } = await import("../../src/server.ts");

// Export utilities for tests
export { app };
export const DISCORD_USER_AGENT = "Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)";

export function createDiscordRequest(requestBuilder: any) {
    return requestBuilder.set("User-Agent", DISCORD_USER_AGENT);
}

// Helper to parse HTML meta tags for validation
export function parseMetaTags(html: string): Record<string, string> {
    const metaTags: Record<string, string> = {};
    const regex = /<meta\s+(?:property|name)="([^"]+)"\s+content="([^"]*)"/g;
    let match;
    while ((match = regex.exec(html)) !== null) {
        metaTags[match[1]] = match[2];
    }
    // Handle un-escaped entities like &quot; if necessary
    return metaTags;
}

// Helper to extract and fetch the embedded oEmbed JSON natively
export async function fetchOEmbed(html: string) {
    const match = /<link\s+type="application\/json\+oembed"\s+href="([^"]+)"/.exec(html);
    if (!match) throw new Error("No oEmbed link found in HTML");
    
    // Decode HTML entities
    const urlStr = match[1].replace(/&amp;/g, '&');
    const url = new URL(urlStr);
    const path = url.pathname + url.search;
    
    const { superoak } = await import("superoak");
    const request = await superoak(app);
    const res = await createDiscordRequest(request.get(path)).expect(200);
    
    return res.body;
}
