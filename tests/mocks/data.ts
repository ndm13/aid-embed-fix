import { AdventureEmbedData, ScenarioEmbedData, UserEmbedData } from "@/src/types/EmbedDataTypes.ts";
import { AnalyticsEntry } from "@/src/types/ReportingTypes.ts";

export function mockScenario(overrides: Partial<ScenarioEmbedData> = {}): ScenarioEmbedData {
    return {
        createdAt: new Date().toISOString(),
        editedAt: null,
        title: "Test Scenario",
        description: "Test Description",
        prompt: "Test Prompt",
        published: true,
        unlisted: false,
        publishedAt: new Date().toISOString(),
        commentCount: 0,
        voteCount: 0,
        saveCount: 0,
        storyCardCount: 0,
        tags: ["test"],
        adventuresPlayed: 0,
        thirdPerson: false,
        nsfw: false,
        contentRating: "Everyone",
        contentRatingLockedAt: null,
        deletedAt: null,
        blockedAt: null,
        image: "https://example.com/image.jpg",
        contentResponses: {
            isSaved: false,
            isDisliked: false
        },
        user: {
            isMember: false,
            id: "user-123",
            profile: {
                title: "Test User",
                thumbImageUrl: "https://example.com/thumb.jpg"
            }
        },
        ...overrides
    };
}

export function mockAdventure(overrides: Partial<AdventureEmbedData> = {}): AdventureEmbedData {
    return {
        createdAt: new Date().toISOString(),
        editedAt: null,
        title: "Test Adventure",
        description: "Test Description",
        actionCount: 10,
        published: true,
        unlisted: false,
        commentCount: 0,
        voteCount: 0,
        saveCount: 0,
        storyCardCount: 0,
        thirdPerson: false,
        nsfw: false,
        contentRating: "Everyone",
        contentRatingLockedAt: null,
        tags: ["test"],
        publishedAt: new Date().toISOString(),
        deletedAt: null,
        blockedAt: null,
        userId: "user-123",
        image: "https://example.com/image.jpg",
        playerCount: 1,
        scenario: {
            title: "Test Scenario",
            published: true,
            deletedAt: null
        },
        user: {
            isMember: false,
            id: "user-123",
            profile: {
                title: "Test User",
                thumbImageUrl: "https://example.com/thumb.jpg"
            }
        },
        ...overrides
    };
}

export function mockUser(overrides: Partial<UserEmbedData> = {}): UserEmbedData {
    return {
        isMember: false,
        id: "user-123",
        profile: {
            thumbImageUrl: "https://example.com/thumb.jpg",
            title: "Test User",
            description: "Test User Description"
        },
        followingCount: 0,
        friendCount: 0,
        followersCount: 0,
        ...overrides
    };
}

export function mockAnalyticsEntry(overrides: Partial<AnalyticsEntry> = {}): AnalyticsEntry {
    return {
        timestamp: Date.now(),
        request: {
            hostname: "localhost",
            path: "/test",
            params: {},
            middleware: "unknown",
            userAgent: "TestAgent",
            browser: undefined,
            platform: undefined
        },
        content: {
            status: "success",
            id: "123",
            type: "scenario"
        },
        ...overrides
    };
}
