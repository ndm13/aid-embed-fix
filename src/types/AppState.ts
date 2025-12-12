import { AIDungeonAPI } from "../api/AIDungeonAPI.ts";
import { RelatedLinks } from "../support/RelatedLinks.ts";
import { AnalyticsEntry, APIDataPoint, RouterDataPoint } from "./ReportingTypes.ts";

export type AppState = {
    api: AIDungeonAPI,
    metrics: {
        router: Partial<RouterDataPoint>,
        api?: Partial<APIDataPoint>
    },
    analytics: Partial<AnalyticsEntry>,
    links: RelatedLinks
};
