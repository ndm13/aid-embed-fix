import { Context } from "@oak/oak";
import { AppState } from "../types/AppState.ts";

export interface Handler {
    handle(ctx: Context<AppState>): Promise<void>;
}
