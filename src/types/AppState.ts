import {AIDungeonAPI} from "../api/AIDungeonAPI.ts";
import {RouterDataPoint} from "./MetricsTypes.ts";

import {RelatedLinks} from "../support/RelatedLinks.ts";

export type AppState = {
    api: AIDungeonAPI,
    metrics: Partial<RouterDataPoint>,
    links: RelatedLinks
}