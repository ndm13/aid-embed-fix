type ContentRating = "Everyone" | "Teen" | "Mature" | "Unrated";

export type ScenarioEmbedData = {
    createdAt: string,
    editedAt: string | null,
    title: string,
    description: string | null,
    prompt: string | null,
    published: boolean,
    unlisted: boolean,
    publishedAt: string | null,
    commentCount: number,
    voteCount: number,
    saveCount: number,
    storyCardCount: number,
    tags: string[],
    adventuresPlayed: number,
    thirdPerson: boolean,
    nsfw: boolean | null,
    contentRating: ContentRating,
    contentRatingLockedAt: string | null,
    deletedAt: string | null,
    blockedAt: string | null,
    image: string,
    contentResponses: {
        isSaved: boolean,
        isDisliked: boolean
    },
    user: {
        isMember: boolean,
        profile: {
            title: string,
            thumbImageUrl: string
        }
    }
};

export type AdventureEmbedData = {
    createdAt: string,
    editedAt: string | null,
    title: string,
    description: string | null,
    actionCount: number,
    published: boolean,
    unlisted: boolean,
    commentCount: number,
    voteCount: number,
    saveCount: number,
    storyCardCount: number,
    thirdPerson: boolean,
    nsfw: boolean | null,
    contentRating: ContentRating,
    contentRatingLockedAt: string | null,
    tags: string[],
    publishedAt: string | null,
    deletedAt: string | null,
    blockedAt: string | null,
    userId: string,
    image: string,
    playerCount: number,
    scenario: {
        title: string,
        published: true,
        deletedAt: string | null
    },
    user: {
        isMember: boolean,
        profile: {
            title: string,
            thumbImageUrl: string
        }
    }
};

export type UserEmbedData = {
    isMember: boolean,
    profile: {
        thumbImageUrl: string,
        title: string,
        description: string
    },
    followingCount: number,
    friendCount: number,
    followersCount: number
};
