import { AIDungeonAPI } from "../api/AIDungeonAPI.ts";
import { RelatedLinks } from "../support/RelatedLinks.ts";
import { RouterDataPoint } from "./MetricsTypes.ts";

export type AppState = {
    api: AIDungeonAPI,
    metrics: Partial<RouterDataPoint>,
    links: RelatedLinks
};
