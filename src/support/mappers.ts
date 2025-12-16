import { AdventureEmbedData, ScenarioEmbedData, UserEmbedData } from "../types/EmbedDataTypes.ts";

export const contentMapper = {
    scenario(data: ScenarioEmbedData) {
        return {
            title: data.title,
            rating: data.contentRating,
            visibility: data.unlisted ? "Unlisted" : "Published",
            author: {
                id: data.user.id,
                title: data.user.profile.title
            }
        };
    },

    adventure(data: AdventureEmbedData) {
        return {
            title: data.title,
            rating: data.contentRating,
            visibility: data.unlisted ? "Unlisted" : "Published",
            author: {
                id: data.userId,
                title: data.user.profile.title
            }
        };
    },

    user(data: UserEmbedData) {
        return {
            title: data.profile.title,
            author: {
                id: data.id,
                title: data.profile.title
            }
        };
    }
};
