import { spy } from "@std/testing/mock";
import { AdventureEmbedData, ScenarioEmbedData, UserEmbedData } from "@/src/types/EmbedDataTypes.ts";
import { AIDungeonAPIError } from "@/src/api/AIDungeonAPIError.ts";

export class MockAIDungeonAPI {
    getScenarioEmbed = spy((_id: string, _published?: boolean): Promise<ScenarioEmbedData> => {
        return Promise.reject(new Error("Not implemented"));
    });

    getAdventureEmbed = spy((_id: string): Promise<AdventureEmbedData> => {
        return Promise.reject(new Error("Not implemented"));
    });

    getUserEmbed = spy((_username: string): Promise<UserEmbedData> => {
        return Promise.reject(new Error("Not implemented"));
    });

    // Helper to simulate API error
    static error(message: string = "API Error") {
        return Promise.reject(AIDungeonAPIError.onUnpack(message, {} as any, { data: {} }));
    }

    // Helper to simulate Network error
    static netError(message: string = "Network Error") {
        return Promise.reject(AIDungeonAPIError.onRequest(message, {} as any, new Error(message)));
    }
}
