import { Context } from "@oak/oak";
import { Next } from "@oak/oak/middleware";

import { AppState } from "../types/AppState.ts";

import log from "../logging/logger.ts";

export function middleware() {
    return async (ctx: Context<AppState>, next: Next) => {
        await next();
        log.info(JSON.stringify(ctx.state.analytics, undefined, 2));
    };
}
