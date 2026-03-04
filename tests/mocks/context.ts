import { createMockContext as createOakMockContext } from "@oak/oak/testing";
import { Context } from "@oak/oak";
import { AppState } from "@/src/types/AppState.ts";
import { RelatedLinks } from "@/src/support/RelatedLinks.ts";
import { AnalyticsEntry } from "@/src/types/ReportingTypes.ts";

export interface MockContextOptions {
    path?: string;
    params?: Record<string, string>;
    query?: Record<string, string>;
    userAgent?: string;
    cookies?: Record<string, string>;
    state?: Partial<AppState>;
}

export function createMockContext(options: MockContextOptions = {}) {
    const {
        path = "/",
        params = {},
        query = {},
        userAgent = "Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)",
        cookies = {},
        state = {}
    } = options;

    const context = createOakMockContext({
        path,
        params,
        state: {
            metrics: {
                router: {
                    endpoint: "",
                    type: ""
                },
                api: {}
            },
            analytics: {
                timestamp: Date.now(),
                content: {
                    status: "unknown"
                },
                request: {
                    hostname: "localhost",
                    path,
                    params: query,
                    middleware: "unknown",
                    userAgent,
                    browser: undefined,
                    platform: undefined
                }
            } as AnalyticsEntry,
            settings: {
                proxy: {},
                link: {}
            },
            ...state
        },
        headers: {
            "User-Agent": userAgent,
            "Cookie": Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join("; ")
        } as any
    });

    // Inject query params into URL
    const url = new URL("http://localhost" + path);
    Object.entries(query).forEach(([k, v]) => url.searchParams.set(k, v));
    // @ts-ignore: read-only property
    context.request.url = url;

    // Initialize RelatedLinks if not provided
    if (!context.state.links) {
        context.state.links = new RelatedLinks(context as unknown as Context<AppState>, {
            oembedProtocol: "https",
            defaultRedirectBase: "https://play.aidungeon.com"
        });
    }

    // Mock user agent parsing (basic)
    // @ts-ignore: userAgent is not on the mock type but is used by the handler
    context.request.userAgent = {
        ua: userAgent,
        browser: { name: userAgent.includes("Discordbot") ? "Discordbot" : "Browser" },
        os: { name: "Linux" }
    };

    return context as unknown as Context<AppState>;
}
