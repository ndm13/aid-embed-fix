export type ResponseType = "success" | "error" | "redirect" | "static" | "unknown";

export type Timings = {
    avg: number,
    max: number,
    requests: number,
    lastRequest: Date
};

export type EndpointMetrics = {
    timings: Timings,
    type: Record<ResponseType, number>
};

export type RouterMetrics = {
    timings: Timings,
    endpoints: Record<string, EndpointMetrics>
};

type RouterDataPoint = {
    timestamp: number,
    endpoint: string,
    duration: number,
    type: ResponseType
};

export class Metrics {
    private routerData: RouterDataPoint[] = [];

    record(endpoint: string, duration: number, type: ResponseType) {
        this.routerData.push({timestamp: Date.now(), endpoint, duration, type});
    }

    get router(): RouterMetrics | {} {
        // Trim old data
        const oneHourAgo = Date.now() - 3600000;
        const cutoff = this.routerData.findIndex(d => d.timestamp >= oneHourAgo);
        if (cutoff === -1 && this.routerData.length > 0) {
            this.routerData = [];
        } else {
            this.routerData.splice(0, cutoff);
        }
        if (this.routerData.length === 0) return {};

        // Otherwise summarize requests
        const routerTimings = Metrics.calculateTimings(this.routerData);
        const endpointsData = this.routerData.reduce((agg, d) => {
            if (!agg[d.endpoint]) {
                agg[d.endpoint] = [];
            }
            agg[d.endpoint].push(d);
            return agg;
        }, {} as Record<string, RouterDataPoint[]>);
        const endpoints = Object.fromEntries(
            Object.entries(endpointsData).map(([endpointName, dataPoints]) => {
                const endpointTimings = Metrics.calculateTimings(dataPoints);
                const byType = dataPoints.reduce((acc, d) => {
                    acc[d.type] = (acc[d.type] || 0) + 1;
                    return acc;
                }, {} as Record<ResponseType, number>);

                return [endpointName, { timings: endpointTimings, type: byType }];
            })
        );
        return { timings: routerTimings, endpoints };
    }

    private static calculateTimings(data: RouterDataPoint[]) {
        if (data.length === 0) {
            return { avg: 0, max: 0, requests: 0, lastRequest: new Date(0) };
        }
        const responseTimes = data.map(d => d.duration);
        const totalResponseTime = responseTimes.reduce((sum, time) => sum + time, 0);
        const lastRequestTimestamp = Math.max(...data.map(d => d.timestamp));

        return {
            avg: parseFloat((totalResponseTime / data.length).toFixed(2)),
            max: Math.max(...responseTimes),
            requests: data.length,
            lastRequest: new Date(lastRequestTimestamp)
        };
    };
}

const metrics = new Metrics();
export default metrics;