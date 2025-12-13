import { superoak } from "superoak";
import { describe, it } from "@std/testing/bdd";
import { app } from "@/src/server.ts";
import { AdventureEmbedData, ScenarioEmbedData, UserEmbedData } from "@/src/types/EmbedDataTypes.ts";
import { AIDungeonAPI } from "@/src/api/AIDungeonAPI.ts";
import { stub } from "@std/testing/mock";
import config from "@/src/config.ts";

const mockScenario: ScenarioEmbedData = {
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
    image: "",
    contentResponses: {
        isSaved: false,
        isDisliked: false
    },
    user: {
        isMember: false,
        profile: {
            title: "testuser",
            thumbImageUrl: ""
        }
    }
};

const mockAdventure: AdventureEmbedData = {
    createdAt: new Date().toISOString(),
    editedAt: null,
    title: "Test Adventure",
    description: "Test Description",
    actionCount: 0,
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
    userId: "789",
    image: "",
    playerCount: 1,
    scenario: {
        title: "Test Scenario",
        published: true,
        deletedAt: null
    },
    user: {
        isMember: false,
        profile: {
            title: "testuser",
            thumbImageUrl: ""
        }
    }
};

const mockUser: UserEmbedData = {
    isMember: false,
    profile: {
        thumbImageUrl: "",
        title: "testuser",
        description: "A test user"
    },
    followingCount: 0,
    friendCount: 0,
    followersCount: 0
};

describe("Middleware Integration Tests", () => {
    describe("Embeds", () => {
        describe("Scenario", () => {
            it("should return a scenario embed with ?no_ua", async () => {
                const apiStub = stub(AIDungeonAPI.prototype, "getScenarioEmbed", () => Promise.resolve(mockScenario));

                try {
                    const request = await superoak(app);
                    await request.get("/scenario/123/test-scenario?no_ua")
                        .expect(200)
                        .expect("Content-Type", /text\/html/);
                } finally {
                    apiStub.restore();
                }
            });

            it("should return a scenario embed with Discordbot user-agent", async () => {
                const apiStub = stub(AIDungeonAPI.prototype, "getScenarioEmbed", () => Promise.resolve(mockScenario));

                try {
                    const request = await superoak(app);
                    await request.get("/scenario/123/test-scenario")
                        .set("User-Agent", "Discordbot/2.0")
                        .expect(200)
                        .expect("Content-Type", /text\/html/);
                } finally {
                    apiStub.restore();
                }
            });

            it("should redirect without ?no_ua or Discordbot user-agent", async () => {
                const request = await superoak(app);
                await request.get("/scenario/123/test-scenario")
                    .expect(301);
            });
        });

        describe("Adventure", () => {
            it("should return an adventure embed with ?no_ua", async () => {
                const apiStub = stub(AIDungeonAPI.prototype, "getAdventureEmbed", () => Promise.resolve(mockAdventure));

                try {
                    const request = await superoak(app);
                    await request.get("/adventure/123/test-adventure?no_ua")
                        .expect(200)
                        .expect("Content-Type", /text\/html/);
                } finally {
                    apiStub.restore();
                }
            });

            it("should return an adventure embed with Discordbot user-agent", async () => {
                const apiStub = stub(AIDungeonAPI.prototype, "getAdventureEmbed", () => Promise.resolve(mockAdventure));

                try {
                    const request = await superoak(app);
                    await request.get("/adventure/123/test-adventure")
                        .set("User-Agent", "Discordbot/2.0")
                        .expect(200)
                        .expect("Content-Type", /text\/html/);
                } finally {
                    apiStub.restore();
                }
            });

            it("should redirect without ?no_ua or Discordbot user-agent", async () => {
                const request = await superoak(app);
                await request.get("/adventure/123/test-adventure")
                    .expect(301);
            });

            it("should return an adventure embed for /read path", async () => {
                const apiStub = stub(AIDungeonAPI.prototype, "getAdventureEmbed", () => Promise.resolve(mockAdventure));

                try {
                    const request = await superoak(app);
                    await request.get("/adventure/123/test-adventure/read?no_ua")
                        .expect(200)
                        .expect("Content-Type", /text\/html/);
                } finally {
                    apiStub.restore();
                }
            });

            it("should redirect for non-/read path", async () => {
                const request = await superoak(app);
                await request.get("/adventure/123/test-adventure/not-read")
                    .expect(302);
            });
        });

        describe("Profile", () => {
            it("should return a profile embed with ?no_ua", async () => {
                const apiStub = stub(AIDungeonAPI.prototype, "getUserEmbed", () => Promise.resolve(mockUser));

                try {
                    const request = await superoak(app);
                    await request.get("/profile/testuser?no_ua")
                        .expect(200)
                        .expect("Content-Type", /text\/html/);
                } finally {
                    apiStub.restore();
                }
            });

            it("should return a profile embed with Discordbot user-agent", async () => {
                const apiStub = stub(AIDungeonAPI.prototype, "getUserEmbed", () => Promise.resolve(mockUser));

                try {
                    const request = await superoak(app);
                    await request.get("/profile/testuser")
                        .set("User-Agent", "Discordbot/2.0")
                        .expect(200)
                        .expect("Content-Type", /text\/html/);
                } finally {
                    apiStub.restore();
                }
            });

            it("should redirect without ?no_ua or Discordbot user-agent", async () => {
                const request = await superoak(app);
                await request.get("/profile/testuser")
                    .expect(301);
            });
        });

        describe("Demo", () => {
            it("should return a demo embed with Discordbot user-agent", async () => {
                const request = await superoak(app);
                await request.get("/")
                    .set("User-Agent", "Discordbot/2.0")
                    .expect(200)
                    .expect("Content-Type", /text\/html/);
            });

            it("should redirect without Discordbot user-agent", async () => {
                const request = await superoak(app);
                await request.get("/")
                    .expect(301);
            });
        });

        it("should redirect on API error", async () => {
            const apiStub = stub(AIDungeonAPI.prototype, "getScenarioEmbed", () => Promise.reject("API Error"));

            try {
                const request = await superoak(app);
                await request.get("/scenario/123/test-scenario?no_ua")
                    .expect(200);
            } finally {
                apiStub.restore();
            }
        });
    });

    describe("oEmbed", () => {
        it("should return oEmbed for Embed Fix", async () => {
            const request = await superoak(app);
            await request.get("/oembed.json?type=Embed+Fix")
                .expect(200)
                .expect("Content-Type", /application\/json/);
        });

        it("should return oEmbed for other types", async () => {
            const request = await superoak(app);
            await request.get("/oembed.json?type=Scenario&author=testuser")
                .expect(200)
                .expect("Content-Type", /application\/json/);
        });

        it("should return 400 for missing type", async () => {
            const request = await superoak(app);
            await request.get("/oembed.json")
                .expect(400);
        });
    });

    describe("Statics", () => {
        it("should return healthcheck", async () => {
            const request = await superoak(app);
            await request.get("/healthcheck")
                .expect(200)
                .expect("Content-Type", /text\/plain/)
                .expect("ok");
        });

        it("should return stylesheet", async () => {
            const request = await superoak(app);
            await request.get("/style.css")
                .expect(200)
                .expect("Content-Type", /text\/css/);
        });

        it("should return robots.txt", async () => {
            const request = await superoak(app);
            await request.get("/robots.txt")
                .expect(200)
                .expect("Content-Type", /text\/plain/);
        });
    });

    describe("Metrics", () => {
        it("should return metrics with key", async () => {
            const request = await superoak(app);
            await request.get(`/metrics?key=${config.metrics.key}`)
                .expect(200)
                .expect("Content-Type", /application\/json/);
        });

        it("should return 401 without key", async () => {
            const request = await superoak(app);
            await request.get("/metrics")
                .expect(401);
        });
    });

    describe("Fallback", () => {
        it("should redirect for unknown routes", async () => {
            const request = await superoak(app);
            await request.get("/unknown")
                .expect(302);
        });
    });
});
