import { AIDungeonAPI } from "../api/AIDungeonAPI.ts";
import { RelatedLinks } from "../support/RelatedLinks.ts";
import {AnalyticsEntry, RouterDataPoint} from "./ReportingTypes.ts";

export type AppState = {
    api: AIDungeonAPI,
    metrics: Partial<RouterDataPoint>,
    analytics: Partial<AnalyticsEntry>,
    links: RelatedLinks
};
