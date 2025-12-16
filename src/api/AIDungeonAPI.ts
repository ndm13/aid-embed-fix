import { AIDungeonAPIError } from "./AIDungeonAPIError.ts";
import { AdventureEmbedData, ScenarioEmbedData, UserEmbedData } from "../types/EmbedDataTypes.ts";
import { GraphQLQuery, GraphQLResponse, IdentityKitCredentials, RefreshTokenResponse } from "../types/AIDungeonAPITypes.ts";

import log from "../logging/logger.ts";

export class AIDungeonAPI {
    private token!: string;
    private refresh!: string;
    private expires!: number;
    public get isExpired() {
        return this.expires < Date.now();
    }

    private constructor(
        private readonly config: AIDungeonAPIConfig,
        credentials: IdentityKitCredentials,
        generated: number,
        private readonly guest = false
    ) {
        this.updateCredentials(credentials, generated);
    }

    static async create(
        config: AIDungeonAPIConfig,
        credentials?: IdentityKitCredentials,
        generated?: number
    ): Promise<AIDungeonAPI> {
        if (credentials) {
            if (!generated) throw TypeError("Invalid generated time");

            return new AIDungeonAPI(config, credentials, generated, false);
        }
        const token = await AIDungeonAPI.getNewGuestToken(config);
        return new AIDungeonAPI(config, token, Date.now(), true);
    }

    async query<T extends Record<string, unknown>>(gql: GraphQLQuery): Promise<GraphQLResponse<string, T>> {
        try {
            await this.keepTokenAlive();
        } catch (error) {
            throw AIDungeonAPIError.onRequest("Error refreshing token", gql, error);
        }
        try {
            return await (await fetch(this.config.gqlEndpoint, {
                credentials: "include",
                headers: {
                    "User-Agent": this.config.userAgent,
                    "Accept": "application/json",
                    "Accept-Language": "en-US,en;q=0.5",
                    "content-type": "application/json",
                    "x-gql-operation-name": gql.operationName,
                    "authorization": `firebase ${this.token}`,
                    "Priority": "u=4"
                },
                referrer: this.config.origin,
                body: JSON.stringify({
                    operationName: gql.operationName,
                    variables: gql.variables,
                    query: gql.query
                }),
                method: "POST"
            })).json();
        } catch (error) {
            throw AIDungeonAPIError.onRequest("Error running GraphQL query", gql, error);
        }
    }

    getScenarioEmbed(shortId: string): Promise<ScenarioEmbedData> {
        const query = {
            operationName: "GetScenario",
            variables: { shortId: shortId },
            query:
                "query GetScenario($shortId: String) {  scenario(shortId: $shortId) {    createdAt    editedAt    title    description    prompt    image    published    unlisted    publishedAt    commentCount    voteCount    saveCount    storyCardCount    tags    adventuresPlayed    thirdPerson    nsfw    contentRating    contentRatingLockedAt    user {      id      isMember      profile {        title        thumbImageUrl      }    }    ...CardSearchable  }}fragment CardSearchable on Searchable {  title  description  image  tags  voteCount  published  unlisted  publishedAt  createdAt  editedAt  deletedAt  blockedAt  saveCount  commentCount  contentRating  user {    id    isMember    profile {      title      thumbImageUrl    }  }  ... on Adventure {    actionCount    userJoined    unlisted    playerCount  }  ... on Scenario {    adventuresPlayed    contentResponses {      isSaved      isDisliked    }  }}"
        };
        return this.query<ScenarioEmbedData>(query)
            .then((res) => AIDungeonAPI.validateResponse(query, res, shortId, "scenario"));
    }

    getAdventureEmbed(shortId: string): Promise<AdventureEmbedData> {
        const query = {
            operationName: "GetAdventure",
            variables: { shortId: shortId },
            query:
                "query GetAdventure($shortId: String) {  adventure(shortId: $shortId) {    createdAt    editedAt    title    description    image    actionCount    published    unlisted    commentCount    voteCount    saveCount    storyCardCount    thirdPerson    nsfw    contentRating    contentRatingLockedAt    tags    user {      id      isMember      profile {        title        thumbImageUrl      }    }    scenario {      title      published      deletedAt      }    ...CardSearchable  }}fragment CardSearchable on Searchable {  title  description  image  tags  voteCount  published  unlisted  publishedAt  createdAt  editedAt  deletedAt  blockedAt  saveCount  commentCount  userId  contentRating  user {    id    isMember    profile {      title      thumbImageUrl    }  }  ... on Adventure {    actionCount    unlisted    playerCount  }  ... on Scenario {    adventuresPlayed  }}"
        };
        return this.query<AdventureEmbedData>(query)
            .then((res) => AIDungeonAPI.validateResponse(query, res, shortId, "adventure"));
    }

    getUserEmbed(username: string): Promise<UserEmbedData> {
        const query = {
            operationName: "ProfileScreenGetUser",
            variables: { username: username },
            query:
                "query ProfileScreenGetUser($username: String) {  user(username: $username) {    id    profile {      thumbImageUrl    }    ...ProfileHeaderUser    ...ProfileMobileHeaderUser  }}fragment ProfileHeaderUser on User {  id  isMember  friendCount  followingCount  followersCount  profile {    title    description    thumbImageUrl  }  ...SocialStatMenuUser  }fragment SocialStatMenuUser on User {  profile {    title  }}fragment ProfileMobileHeaderUser on User {  id  friendCount  followingCount  followersCount  isMember  profile {    title    description    thumbImageUrl  }  ...SocialStatMenuUser}"
        };
        return this.query<UserEmbedData>(query)
            .then((res) => AIDungeonAPI.validateResponse(query, res, username, "user"));
    }

    private async keepTokenAlive() {
        if (this.isExpired) {
            // Already expired: generate a new token if guest, otherwise error out
            if (this.guest) {
                const replace = await AIDungeonAPI.getNewGuestToken(this.config);
                this.updateCredentials(replace, Date.now());
                log.debug(`Created new user token (valid until ${new Date(this.expires)})`);
            } else {
                this.token = "";
                throw new Error("Non-guest API token expired, unable to refresh token");
            }
        } else if (this.expires - Date.now() < 300000) {
            // Less than five minutes left, refresh
            const refresh = await this.refreshToken();
            const now = Date.now();
            this.token = refresh.id_token;
            this.refresh = refresh.refresh_token;
            this.expires = now + (Number.parseInt(refresh.expires_in) * 1000);
            log.debug(`Refreshed user token (valid until ${new Date(this.expires)})`);
        }
    }

    private updateCredentials(credentials: IdentityKitCredentials, generated: number) {
        this.token = credentials.idToken;
        this.refresh = credentials.refreshToken;
        this.expires = generated + (Number.parseInt(credentials.expiresIn) * 1000);
    }

    private refreshToken() {
        return fetch(
            "https://securetoken.googleapis.com/v1/token?key=" +
                this.config.firebase.identityToolkitKey,
            {
                headers: {
                    "User-Agent": this.config.userAgent,
                    "Origin": this.config.origin,
                    "Accept": "*/*",
                    "Accept-Language": "en-US,en;q=0.5",
                    "X-Client-Version": this.config.firebase.clientVersion,
                    "X-Firebase-Client": this.config.firebase.clientToken,
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                body: `grant_type=refresh_token&refresh_token=${this.refresh}`,
                method: "POST"
            }
        ).then((r) => r.json() as Promise<RefreshTokenResponse>);
    }

    private static getNewGuestToken(config: AIDungeonAPIConfig) {
        return fetch(
            "https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=" +
                config.firebase.identityToolkitKey,
            {
                credentials: "omit",
                headers: {
                    "User-Agent": config.userAgent,
                    "Origin": config.origin,
                    "Accept": "*/*",
                    "Accept-Language": "en-US,en;q=0.5",
                    "X-Client-Version": config.firebase.clientVersion,
                    "X-Firebase-Client": config.firebase.clientToken,
                    "Content-Type": "application/json"
                },
                body: '{"returnSecureToken":true}',
                method: "POST"
            }
        ).then((r) => r.json() as Promise<IdentityKitCredentials>);
    }

    private static validateResponse<K extends string, T>(
        query: GraphQLQuery,
        response: { data?: Record<K, T> },
        id: string,
        key: K
    ): T {
        const output = response?.data?.[key];
        if (!output) {
            throw AIDungeonAPIError.onUnpack(`Couldn't find ${key} with id ${id}`, query, response);
        }

        return output;
    }
}

export type AIDungeonAPIConfig = {
    gqlEndpoint: string,
    userAgent: string,
    origin: string,
    firebase: {
        identityToolkitKey: string,
        clientToken: string,
        clientVersion: string
    }
};
