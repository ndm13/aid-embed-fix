export type EndpointResponseType = "success" | "error" | "redirect" | "static" | "unknown";
export type Timings = {
    avg: number,
    max: number,
    requests: number,
    lastRequest: Date
};
export type EndpointMetrics = {
    timings: Timings,
    type: Record<EndpointResponseType, number>
};
export type RouterMetrics = {
    timings: Timings,
    endpoints: Record<string, EndpointMetrics>
};
export type RouterDataPoint = {
    timestamp: number,
    endpoint: string,
    duration: number,
    type: EndpointResponseType
};
export type APIResult = "success" | "api_error" | "net_error" | "unknown";
export type APIMethodMetrics = {
    timings: Timings,
    results: Record<APIResult, number>
};
export type APIMetrics = {
    timings: Timings,
    methods: Record<string, APIMethodMetrics>
};
export type APIDataPoint = {
    timestamp: number,
    method: string,
    duration: number,
    result: APIResult;
};