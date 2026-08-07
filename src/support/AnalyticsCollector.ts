import { createClient, SupabaseClient } from "@supabase/supabase-js";

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

type SupabaseAnalyticsEntry = Omit<AnalyticsEntry, "timestamp"> & { timestamp: string };

const encoder = new TextEncoder();

function stripNullBytes<T>(payload: T): T {
    if (typeof payload === "string")
        return payload.replace(/\0/g, "") as T; // T is string

    if (Array.isArray(payload))
        return payload.map(item => stripNullBytes(item)) as T; // T is array

    if (payload !== null && typeof payload === "object") {
        const cleaned: Record<string, any> = {};
        for (const [key, value] of Object.entries(payload))
            cleaned[key.replace(/\0/g, "")] = stripNullBytes(value);
        return cleaned as T; // T is Record<string, any> (object)
    }

    return payload;
}

export class AnalyticsCollector {
    private readonly buffer: AnalyticsEntry[] = [];
    private readonly failed: AnalyticsEntry[] = [];
    private readonly cache: Record<string, CacheEntry> = {};
    private readonly supabase: SupabaseClient<any, "ingest", any>;
    private readonly timerId: number;

    private constructor(
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

    static async create(api: AIDungeonAPI, config: AnalyticsConfig) {
        const collector = new AnalyticsCollector(api, config);
        try {
            await collector.testSecret();
        } catch (e) {
            collector.cleanup();
            throw e;
        }
        return collector;
    }

    private async testSecret() {
        const { error } = await this.supabase.rpc("ingest_analytics", {
            secret: this.config.ingestSecret,
            payload: []
        });

        if (error) {
            log.error(error);
            throw new Error("Invalid ingest secret", { cause: error });
        }
    }

    async record(entry: AnalyticsEntry) {
        const id = entry.content!.id;
        if (!entry.content.status && id) {
            const cached = this.cache[id];
            if (cached && (Date.now() - cached.timestamp < this.config.cacheExpiration)) {
                entry.content = { ...cached.content };
                entry.content.status = "cache";
            } else {
                try {
                    let published: boolean | undefined;
                    if (entry.content.type === "scenario") {
                        const params = entry.request.params;
                        if (params["published"] === "true") published = true;
                        else if (params["unlisted"] === "true") published = false;
                    }

                    const content = await this.fetchContent(entry.content.type as "scenario" | "adventure" | "profile", id, published);
                    entry.content = content;
                    this.cache[id] = { content, timestamp: Date.now() };
                } catch (error) {
                    log.error("Error fetching content for analytics");
                    log.error(error);
                    entry.content.status = "api_error";
                }
            }
        }

        if (!entry.content.status && entry.content.id) {
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

        const MAX_BYTES = 100 * 1024; // 100KB limit
        let currentBatchBytes = 0;
        let batchCount = 0;

        for (let i = 0; i < this.buffer.length; i++) {
            const entry = this.buffer[i];
            const entryBytes = encoder.encode(JSON.stringify(entry)).length;

            if (currentBatchBytes + entryBytes > MAX_BYTES && batchCount > 0) {
                break;
            }

            currentBatchBytes += entryBytes;
            batchCount++;
        }

        const rawBatch = this.buffer.splice(0, batchCount);
        const clean = [] as AnalyticsEntry[];
        const entriesToProcess = [] as SupabaseAnalyticsEntry[];

        rawBatch.forEach(entry => {
            try {
                const prepared = {
                    ...stripNullBytes({
                        ...entry,
                        timestamp: new Date(entry.timestamp ?? "").toISOString()
                    }),
                };
                clean.push(entry); 
                entriesToProcess.push(prepared);
            } catch (error) {
                log.error("Failed to sanitize analytics entry:");
                log.error(entry);
                log.error(error);
                this.failed.push(entry);
            }
        });

        if (entriesToProcess.length === 0) {
            return;
        }

        await this.sendWithBisection(entriesToProcess, clean);
    }

    private async sendWithBisection(payloads: SupabaseAnalyticsEntry[], originalEntries: AnalyticsEntry[]) {
        if (payloads.length === 0) return;

        try {
            const { error } = await this.supabase.rpc("ingest_analytics", {
                secret: this.config.ingestSecret,
                payload: payloads
            });

            if (error) throw error;
            log.info(`Successfully sent ${payloads.length} analytics entries to Supabase`);
            
        } catch (error) {
            if (this.isCloudflareBlock(error)) {
                log.warn(`Cloudflare WAF triggered on batch of ${payloads.length}. Isolating...`);
                
                if (payloads.length === 1) {
                    log.error("Identified poison pill triggering WAF:");
                    log.error(payloads[0]);
                    this.failed.push(originalEntries[0]);
                    return;
                }

                const mid = Math.floor(payloads.length / 2);
                
                const leftPayloads = payloads.slice(0, mid);
                const leftOriginal = originalEntries.slice(0, mid);
                await this.sendWithBisection(leftPayloads, leftOriginal);

                const rightPayloads = payloads.slice(mid);
                const rightOriginal = originalEntries.slice(mid);
                await this.sendWithBisection(rightPayloads, rightOriginal);
                
            } else {
                log.error("Error sending analytics to Supabase, re-buffering entries");
                log.error(error);
                this.buffer.push(...originalEntries);
            }
        }
    }

    private isCloudflareBlock(error: any): boolean {
        if (!error) return false;
        const errorString = typeof error === 'string' ? error : JSON.stringify(error);
        return errorString.includes("Attention Required! | Cloudflare") || 
               errorString.includes("Cloudflare Ray ID");
    }

    private async fetchContent(type: "scenario" | "adventure" | "profile", id: string, published?: boolean): Promise<Content> {
        switch (type) {
            case "scenario": {
                const data = await this.api.getScenarioEmbed(id, published);
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
            case "profile": {
                const data = await this.api.getUserEmbed(id);
                return {
                    status: "success",
                    id,
                    type,
                    ...contentMapper.user(data)
                };
            }
            default:
                throw new TypeError(`Unknown content type: ${type}`);
        }
    }

    async cleanup() {
        clearInterval(this.timerId);
        await this.process();
        if (this.buffer.length > 0) {
            log.warn("Unable to send analytics to Supabase, logging to console instead.");
            this.buffer
                .sort((a, b) => a.timestamp - b.timestamp)  // sort ascending
                .forEach(e => console.log(JSON.stringify(e)));
        }
        if (this.failed.length > 0) {
            log.warn(`Failed to sanitize ${this.failed.length} entries, logging to console instead.`);
            this.failed
                .sort((a, b) => a.timestamp - b.timestamp)  // sort ascending
                .forEach(e => console.log(JSON.stringify(e)));
        }
    }
}
