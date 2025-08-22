import {countByKey, groupByKey} from "./utils/metrics.ts";
import {
    APIDataPoint,
    APIMetrics,
    APIResult,
    EndpointResponseType,
    RouterDataPoint,
    RouterMetrics,
    Timings
} from "./types/MetricsTypes.ts";

export class Metrics {
    private routerData: RouterDataPoint[] = [];
    private apiData: APIDataPoint[] = [];

    recordEndpoint(endpoint: string, duration: number, type: EndpointResponseType) {
        this.routerData.push({timestamp: Date.now(), endpoint, duration, type});
    }

    recordAPICall(method: string, duration: number, result: APIResult) {
        this.apiData.push({timestamp: Date.now(), method, duration, result});
    }

    readonly window = 3600000;

    constructor() {
        Deno.unrefTimer(setInterval(() => {
            this.prune(this.routerData);
            this.prune(this.apiData);
        }, this.window));
    }

    get router(): RouterMetrics | Record<PropertyKey, never> {
        this.prune(this.routerData);
        if (this.routerData.length === 0) return {};

        return {
            timings: Metrics.calculateTimings(this.routerData),
            endpoints: Object.fromEntries(
                Object.entries(groupByKey(this.routerData, "endpoint"))
                    .map(([k, data]) => [k, {
                        timings: Metrics.calculateTimings(data),
                        type: countByKey(data, "type")
                    }])
            )
        };
    }

    get api(): APIMetrics | Record<PropertyKey, never> {
        this.prune(this.apiData);
        if (this.apiData.length === 0) return {};

        return {
            timings: Metrics.calculateTimings(this.apiData),
            methods: Object.fromEntries(
                Object.entries(groupByKey(this.apiData, "method"))
                    .map(([k, data]) => [k, {
                        timings: Metrics.calculateTimings(data),
                        results: countByKey(data, "result")
                    }])
            )
        };
    }

    private prune(data: {timestamp: number}[]) {
        const cutoff = data.findIndex(d => d.timestamp >= Date.now() - this.window);
        if (cutoff === -1 && data.length > 0) {
            data.length = 0;
        } else {
            data.splice(0, cutoff);
        }
    }

    private static calculateTimings(data: {timestamp: number, duration: number}[]): Timings {
        if (data.length === 0) {
            return { avg: 0, max: 0, requests: 0, lastRequest: new Date(0) };
        }
        const responseTimes = data.map(d => d.duration);
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

const metrics = new Metrics();
export default metrics;