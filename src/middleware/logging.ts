import { Context } from "@oak/oak";
import type {AppState} from "../types/AppState.ts";
import { Next } from "@oak/oak/middleware";
import log from "../logging/logger.ts";

export function middleware() {
    return async (ctx: Context<AppState>, next: Next) => {
        await next();
        if (ctx.state.metrics.endpoint === "healthcheck") {
            log.debug("Served", ctx);
        } else {
            log.info("Served", ctx);
        }
    }
}