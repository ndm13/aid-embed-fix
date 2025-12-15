import { createClient, SupabaseClient } from "npm:@supabase/supabase-js";

import { AnalyticsEntry, Content } from "../types/ReportingTypes.ts";
import { AIDungeonAPI } from "../api/AIDungeonAPI.ts";
import log from "../logging/logger.ts";
import { contentMapper } from "./mappers.ts";

export type AnalyticsConfig = {
    processingInterval: number,
    cacheExpiration: number,
    supabaseUrl: string,
    supabaseKey: string,
    ingestSecret: string
};

type CacheEntry = {
    content: Partial<Content>,
    timestamp: number
};

export class AnalyticsCollector {
    private readonly buffer: AnalyticsEntry[] = [];
    private readonly cache: Record<string, CacheEntry> = {};
    private readonly supabase: SupabaseClient<any, "ingest", any>;
    private readonly timerId: number;

    constructor(
        private readonly api: AIDungeonAPI,
        private readonly config: AnalyticsConfig
    ) {
        this.supabase = createClient(config.supabaseUrl, config.supabaseKey, {
            db: {
                schema: "ingest"
            },
            auth: {
                autoRefreshToken: false,
                persistSession: false,
                detectSessionInUrl: false
            }
        });
        this.timerId = setInterval(() => this.process(), config.processingInterval);
        Deno.unrefTimer(this.timerId);
    }

    async record(entry: AnalyticsEntry) {
        const id = entry.content!.id;
        if (entry.content.status === "unknown" && id) {
            const cached = this.cache[id];
            if (cached && (Date.now() - cached.timestamp < this.config.cacheExpiration)) {
                entry.content = cached.content;
                entry.content.status = "cache";
            } else {
                try {
                    const content = await this.fetchContent(entry.content.type as "scenario" | "adventure" | "user", id);
                    entry.content = content;
                    this.cache[id] = { content, timestamp: Date.now() };
                } catch (error) {
                    log.error("Error fetching content for analytics:", error);
                    entry.content.status = "api_error";
                }
            }
        }

        if (entry.content.status !== "unknown" && entry.content.id) {
            this.cache[entry.content.id] = { content: entry.content, timestamp: Date.now() };
        }

        this.buffer.push(entry);
    }

    private pruneCache() {
        const now = Date.now();
        for (const id in this.cache) {
            if (now - this.cache[id].timestamp >= this.config.cacheExpiration) {
                delete this.cache[id];
            }
        }
    }

    private async process() {
        this.pruneCache();

        if (this.buffer.length === 0) {
            return;
        }

        const entriesToProcess = this.buffer.map((entry: any) => {
            const processed = { ...entry };
            if (typeof processed.timestamp === "number") {
                processed.timestamp = new Date(processed.timestamp).toISOString();
            }
            return processed;
        });
        this.buffer.length = 0;

        try {
            const { error } = await this.supabase.rpc("ingest_analytics", {
                secret: this.config.ingestSecret,
                payload: entriesToProcess
            });
            if (error) throw error;
            log.info(`Successfully sent ${entriesToProcess.length} analytics entries to Supabase`);
        } catch (error) {
            log.error("Error sending analytics to Supabase, re-buffering entries:", error);
            this.buffer.push(...entriesToProcess);
        }
    }

    private async fetchContent(type: "scenario" | "adventure" | "user", id: string): Promise<Content> {
        switch (type) {
            case "scenario": {
                const data = await this.api.getScenarioEmbed(id);
                return {
                    status: "success",
                    id,
                    type,
                    ...contentMapper.scenario(data)
                };
            }
            case "adventure": {
                const data = await this.api.getAdventureEmbed(id);
                return {
                    status: "success",
                    id,
                    type,
                    ...contentMapper.adventure(data)
                };
            }
            case "user": {
                const data = await this.api.getUserEmbed(id);
                return {
                    status: "success",
                    id,
                    type,
                    ...contentMapper.user(data)
                };
            }
        }
    }

    async cleanup() {
        clearInterval(this.timerId);
        await this.process();
        if (this.buffer.length > 0) {
            log.warn("Unable to send analytics to Supabase, logging to console instead.");
            console.log(JSON.stringify(this.buffer));
        }
    }
}
