// tests/integration/mockData.ts

export const MOCK_SCENARIOS: Record<string, any> = {
    "found-published": {
        createdAt: "2023-01-01T00:00:00.000Z",
        editedAt: "2023-01-02T00:00:00.000Z",
        title: "Test Scenario",
        description: "A test scenario description",
        prompt: "You are a test...",
        image: "https://example.com/image.png",
        published: true,
        unlisted: false,
        publishedAt: "2023-01-01T00:00:00.000Z",
        commentCount: 10,
        voteCount: 100,
        saveCount: 50,
        storyCardCount: 5,
        tags: ["test", "fantasy"],
        adventuresPlayed: 500,
        thirdPerson: false,
        nsfw: false,
        contentRating: "everyone",
        contentRatingLockedAt: null,
        user: {
            id: "user-1",
            isMember: true,
            profile: {
                title: "Creator",
                thumbImageUrl: "https://example.com/avatar.png"
            }
        }
    },
    "found-unlisted": {
        title: "Unlisted Scenario",
        description: "An unlisted scenario",
        published: false,
        unlisted: true,
        user: { id: "user-2", isMember: false, profile: { title: "Anon" } }
    },
    "no-cover": {
        title: "No Cover Scenario",
        description: "No image",
        image: "",
        published: true,
        unlisted: false,
        user: { id: "user-3", isMember: false, profile: { title: "Anon" } }
    },
    "prompt-fallback": {
        title: "Prompt Scenario",
        description: null,
        prompt: "This is the prompt text",
        image: "https://example.com/image.png",
        published: true,
        user: { id: "user-4", isMember: false, profile: { title: "PromptUser" } }
    },
    "long-description": {
        title: "Long Scenario",
        description: "A".repeat(1500),
        image: "https://example.com/image.png",
        published: true,
        user: { id: "user-5", isMember: false, profile: { title: "LongUser" } }
    }
};

export const MOCK_ADVENTURES: Record<string, any> = {
    "found-published": {
        createdAt: "2023-01-01T00:00:00.000Z",
        editedAt: "2023-01-02T00:00:00.000Z",
        title: "Test Adventure",
        description: "A test adventure description",
        image: "https://example.com/adv-image.png",
        actionCount: 20,
        published: true,
        unlisted: false,
        commentCount: 2,
        voteCount: 15,
        saveCount: 5,
        storyCardCount: 0,
        thirdPerson: false,
        nsfw: false,
        contentRating: "everyone",
        contentRatingLockedAt: null,
        tags: ["magic"],
        user: {
            id: "user-1",
            isMember: true,
            profile: {
                title: "Creator",
                thumbImageUrl: "https://example.com/avatar.png"
            }
        },
        scenario: {
            title: "Source Scenario",
            published: true,
            deletedAt: null
        }
    },
    "found-unlisted": {
        title: "Unlisted Adventure",
        description: "An unlisted adventure",
        published: false,
        unlisted: true,
        user: { id: "user-2", isMember: false, profile: { title: "Anon" } }
    },
    "long-description": {
        title: "Long Adventure",
        description: "A".repeat(1500),
        image: "https://example.com/image.png",
        published: true,
        user: { id: "user-5", isMember: false, profile: { title: "LongUser" } }
    }
};

export const MOCK_USERS: Record<string, any> = {
    "found-user": {
        id: "user-1",
        isMember: true,
        friendCount: 5,
        followingCount: 10,
        followersCount: 100,
        profile: {
            title: "Test User",
            description: "Just testing things out",
            thumbImageUrl: "https://example.com/avatar.png"
        }
    }
};

export function mockGraphQLResponse(body: any) {
    if (body.operationName === "GetScenario") {
        const shortId = body.variables.shortId;
        const viewPublished = body.variables.viewPublished;
        const scenario = MOCK_SCENARIOS[shortId];
        
        // If not found in mock data, return null
        if (!scenario) return { data: { scenario: null } };
        
        // Match published/unlisted state based on viewPublished
        // viewPublished === true -> requires published === true
        // viewPublished === false -> requires unlisted === true
        if (viewPublished === true && !scenario.published) {
            return { data: { scenario: null } };
        }
        if (viewPublished === false && !scenario.unlisted) {
            return { data: { scenario: null } };
        }
        
        return { data: { scenario } };
    }
    
    if (body.operationName === "GetAdventure") {
        const shortId = body.variables.shortId;
        const adventure = MOCK_ADVENTURES[shortId] || null;
        return { data: { adventure } };
    }
    
    if (body.operationName === "ProfileScreenGetUser") {
        const username = body.variables.username;
        const user = MOCK_USERS[username] || null;
        return { data: { user } };
    }
    
    return { data: null };
}
