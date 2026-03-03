import { createMockContext } from "@oak/oak/testing";
import { Context } from "@oak/oak";
import { AppState } from "@/src/types/AppState.ts";
import { RelatedLinks } from "@/src/support/RelatedLinks.ts";

export function createTestContext(
    state: Partial<AppState> = {},
    params: Record<string, string> = {},
    url: string = "http://localhost/"
) {
    const context = createMockContext({
        state: {
            metrics: {
                router: {
                    endpoint: "",
                    type: ""
                }
            },
            analytics: {
                timestamp: Date.now(),
                content: {
                    status: "unknown"
                }
            },
            settings: {
                proxy: {},
                link: {}
            },
            ...state
        },
        params
    });

    // @ts-ignore: read-only property
    context.request.url = new URL(url);

    context.state.links = new RelatedLinks(context as unknown as Context<AppState>, {
        oembedProtocol: "https",
        defaultRedirectBase: "https://default.aidungeon.com"
    });

    // @ts-ignore: userAgent is not on the mock type but is used by the handler
    context.request.userAgent = {
        ua: "Discordbot/2.0"
    };

    return context as unknown as Context<AppState>;
}
