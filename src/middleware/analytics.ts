import { Context } from "@oak/oak";
import { Next } from "@oak/oak/middleware";

import { AppState } from "../types/AppState.ts";
import { AnalyticsEntry } from "../types/ReportingTypes.ts";
import { AnalyticsCollector } from "../support/AnalyticsCollector.ts";

export function middleware(analytics: AnalyticsCollector) {
    return async (ctx: Context<AppState>, next: Next) => {
        await next();
        analytics.record(ctx.state.analytics as AnalyticsEntry);
    };
}
