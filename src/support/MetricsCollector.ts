import _ from "npm:lodash";

import {
    APIDataPoint,
    APIMetrics,
    APIResult,
    EndpointResponseType,
    RouterDataPoint,
    RouterMetrics,
    Timings
} from "../types/ReportingTypes.ts";

const { countBy, groupBy } = _;

export class MetricsCollector {
    private routerData: RouterDataPoint[] = [];
    private apiData: APIDataPoint[] = [];
    private readonly timerId: number;

    recordEndpoint(endpoint: string, duration: number, type: EndpointResponseType) {
        if (this.config.scopes.router) {
            this.routerData.push({ timestamp: Date.now(), endpoint, duration, type });
        }
    }

    recordAPICall(method: string, duration: number, result: APIResult) {
        if (this.config.scopes.api) {
            this.apiData.push({ timestamp: Date.now(), method, duration, result });
        }
    }

    get window() {
        return this.config.window;
    }

    constructor(
        private readonly config: MetricsConfig
    ) {
        this.timerId = setInterval(() => {
            this.prune(this.routerData);
            this.prune(this.apiData);
        }, config.window);
        Deno.unrefTimer(this.timerId);
    }

    cleanup() {
        clearInterval(this.timerId);
    }

    get router(): RouterMetrics | Record<PropertyKey, never> {
        this.prune(this.routerData);
        if (this.routerData.length === 0) return {};

        return {
            timings: MetricsCollector.calculateTimings(this.routerData),
            endpoints: Object.fromEntries(
                Object.entries(groupBy(this.routerData, "endpoint"))
                    .map(([k, data]) => [k, {
                        timings: MetricsCollector.calculateTimings(data as RouterDataPoint[]),
                        type: countBy(data, "type")
                    }])
            )
        };
    }

    get api(): APIMetrics | Record<PropertyKey, never> {
        this.prune(this.apiData);
        if (this.apiData.length === 0) return {};

        return {
            timings: MetricsCollector.calculateTimings(this.apiData),
            methods: Object.fromEntries(
                Object.entries(groupBy(this.apiData, "method"))
                    .map(([k, data]) => [k, {
                        timings: MetricsCollector.calculateTimings(data as APIDataPoint[]),
                        results: countBy(data, "result")
                    }])
            )
        };
    }

    private prune(data: { timestamp: number }[]) {
        const cutoff = data.findIndex((d) => d.timestamp >= Date.now() - this.window);
        if (cutoff === -1 && data.length > 0) {
            data.length = 0;
        } else {
            data.splice(0, cutoff);
        }
    }

    private static calculateTimings(data: { timestamp: number, duration: number }[]): Timings {
        const responseTimes = data.map((d) => d.duration);
        const totalResponseTime = responseTimes.reduce((sum, time) => sum + time, 0);
        const lastRequestTimestamp = data[data.length - 1].timestamp;

        return {
            avg: parseFloat((totalResponseTime / data.length).toFixed(2)),
            max: Math.max(...responseTimes),
            requests: data.length,
            lastRequest: new Date(lastRequestTimestamp)
        };
    }
}

export type MetricsConfig = {
    scopes: {
        api: boolean,
        router: boolean
    },
    window: number
};
