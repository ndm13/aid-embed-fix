import {config} from "./config.ts";
import {AdventureEmbedData, ScenarioEmbedData, UserEmbedData} from "./types/EmbedDataTypes.ts";
import {
    GraphQLQuery,
    GraphQLResponse,
    IdentityKitCredentials,
    RefreshTokenResponse
} from "./types/AIDungeonAPITypes.ts";
import {AIDungeonAPIError} from "./AIDungeonAPIError.ts";
import log from "./logger.ts";

export class AIDungeonAPI {
    private _lastRequestAt = 0;
    public get lastRequestAt() {
        return this._lastRequestAt;
    }
    private _lastRefreshAt = 0;
    public get lastRefreshAt() {
        return this._lastRefreshAt;
    }
    private _token: string;
    public get firebaseToken() {
        return this._token;
    }
    private _refresh: string;
    private _expires: number;
    public get isExpired() {
        return this._expires < Date.now();
    }
    private readonly _guest: boolean;

    constructor(
        credentials: IdentityKitCredentials,
        generated: number,
        guest = false,
    ) {
        this._token = credentials.idToken;
        this._refresh = credentials.refreshToken;
        this._expires = generated +
            (Number.parseInt(credentials.expiresIn) * 1000);
        this._guest = guest;
    }

    async query<T extends Record<string, unknown>>(gql: GraphQLQuery): Promise<GraphQLResponse<string, T>> {
        try {
            await this.keepTokenAlive();
        } catch (error) {
            throw AIDungeonAPIError.onRequest("Error refreshing token", gql, error);
        }
        try {
            return await (await fetch(config.client.gqlEndpoint, {
                "credentials": "include",
                "headers": {
                    "User-Agent": config.client.userAgent,
                    "Accept": "application/json",
                    "Accept-Language": "en-US,en;q=0.5",
                    "content-type": "application/json",
                    "x-gql-operation-name": gql.operationName,
                    "authorization": `firebase ${this._token}`,
                    "Priority": "u=4",
                },
                "referrer": config.client.origin,
                "body": JSON.stringify({
                    "operationName": gql.operationName,
                    "variables": gql.variables,
                    "query": gql.query,
                }),
                "method": "POST",
            })).json();
        } catch (error) {
            throw AIDungeonAPIError.onRequest("Error running GraphQL query", gql, error);
        } finally {
            this._lastRequestAt = Date.now();
        }
    }

    async getScenarioEmbed(shortId: string): Promise<ScenarioEmbedData> {
        const query = {
            operationName: "GetScenario",
            variables: { "shortId": shortId },
            query:
                "query GetScenario($shortId: String) {  scenario(shortId: $shortId) {    createdAt    editedAt    title    description    prompt    image    published    unlisted    publishedAt    commentCount    voteCount    saveCount    storyCardCount    tags    adventuresPlayed    thirdPerson    nsfw    contentRating    contentRatingLockedAt    user {      isMember      profile {        title        thumbImageUrl      }    }    ...CardSearchable  }}fragment CardSearchable on Searchable {  title  description  image  tags  voteCount  published  unlisted  publishedAt  createdAt  editedAt  deletedAt  blockedAt  saveCount  commentCount  contentRating  user {    isMember    profile {      title      thumbImageUrl    }  }  ... on Adventure {    actionCount    userJoined    unlisted    playerCount  }  ... on Scenario {    adventuresPlayed    contentResponses {      isSaved      isDisliked    }  }}",
        };
        return AIDungeonAPI.validateResponse(query, await this.query<ScenarioEmbedData>(query), shortId, 'scenario');
    }

    async getAdventureEmbed(shortId: string): Promise<AdventureEmbedData> {
        const query = {
            operationName: "GetAdventure",
            variables: {"shortId": shortId},
            query: "query GetAdventure($shortId: String) {  adventure(shortId: $shortId) {    createdAt    editedAt    title    description    image    actionCount    published    unlisted    commentCount    voteCount    saveCount    storyCardCount    thirdPerson    nsfw    contentRating    contentRatingLockedAt    tags    user {      isMember      profile {        title        thumbImageUrl      }    }    scenario {      title      published      deletedAt      }    ...CardSearchable  }}fragment CardSearchable on Searchable {  title  description  image  tags  voteCount  published  unlisted  publishedAt  createdAt  editedAt  deletedAt  blockedAt  saveCount  commentCount  userId  contentRating  user {    isMember    profile {      title      thumbImageUrl    }  }  ... on Adventure {    actionCount    unlisted    playerCount  }  ... on Scenario {    adventuresPlayed  }}"
        };
        return AIDungeonAPI.validateResponse(query, await this.query<AdventureEmbedData>(query), shortId, 'adventure');
    }

    async getUserEmbed(username: string): Promise<UserEmbedData> {
        const query = {
            operationName: "ProfileScreenGetUser",
            variables: {"username": username},
            query: "query ProfileScreenGetUser($username: String) {  user(username: $username) {    profile {      thumbImageUrl    }    ...ProfileHeaderUser    ...ProfileMobileHeaderUser  }}fragment ProfileHeaderUser on User {  isMember  friendCount  followingCount  followersCount  profile {    title    description    thumbImageUrl  }  ...SocialStatMenuUser  }fragment SocialStatMenuUser on User {  profile {    title  }}fragment ProfileMobileHeaderUser on User {  friendCount  followingCount  followersCount  isMember  profile {    title    description    thumbImageUrl  }  ...SocialStatMenuUser}"
        };
        return AIDungeonAPI.validateResponse(query, await this.query<UserEmbedData>(query), username, 'user');
    }

    private async keepTokenAlive() {
        if (this.isExpired) {
            // Already expired: generate a new token if guest, otherwise error out
            if (this._guest) {
                const replace = await AIDungeonAPI.getNewGuestToken();
                this._token = replace.idToken;
                this._refresh = replace.refreshToken;
                this._expires = Date.now() + (Number.parseInt(replace.expiresIn) * 1000);
                this._lastRefreshAt = 0;
                log.debug("Created new user token", {expires: this._expires});
            } else {
                this._token = "";
                throw new Error("Non-guest API token expired, unable to refresh token");
            }
        } else if (this._expires - Date.now() < 300000) {
            // Less than five minutes left, refresh
            const refresh = await this.refreshToken();
            const now = Date.now();
            this._token = refresh.id_token;
            this._refresh = refresh.refresh_token;
            this._expires = now + (Number.parseInt(refresh.expires_in) * 1000);
            this._lastRefreshAt = now;
            log.debug("Refreshed user token", {expires: this._expires});
        }
    }

    private async refreshToken() {
        return await (await fetch(
            "https://securetoken.googleapis.com/v1/token?key=" +
                config.firebase.identityToolkitKey,
            {
                "headers": {
                    "User-Agent": config.client.userAgent,
                    "Origin": config.client.origin,
                    "Accept": "*/*",
                    "Accept-Language": "en-US,en;q=0.5",
                    "X-Client-Version": config.firebase.clientVersion,
                    "X-Firebase-Client": config.firebase.clientToken,
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                "body": `grant_type=refresh_token&refresh_token=${this._refresh}`,
                "method": "POST",
            },
        )).json() as Promise<RefreshTokenResponse>;
    }

    static async guest() {
        return new AIDungeonAPI(await AIDungeonAPI.getNewGuestToken(), Date.now(), true);
    }

    private static async getNewGuestToken() {
        return await (await fetch(
            "https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=" +
                config.firebase.identityToolkitKey,
            {
                "credentials": "omit",
                "headers": {
                    "User-Agent": config.client.userAgent,
                    "Origin": config.client.origin,
                    "Accept": "*/*",
                    "Accept-Language": "en-US,en;q=0.5",
                    "X-Client-Version": config.firebase.clientVersion,
                    "X-Firebase-Client": config.firebase.clientToken,
                    "Content-Type": "application/json",
                },
                "body": '{"returnSecureToken":true}',
                "method": "POST",
            },
        )).json() as Promise<IdentityKitCredentials>;
    }

    private static validateResponse<K extends string, T>(
        query: GraphQLQuery, response: { data?: Record<K, T> }, id: string, key: K
    ): T {
        const output = response?.data?.[key];
        if (!output)
            throw AIDungeonAPIError.onUnpack(`Couldn't find ${key} with id ${id}`, query, response);

        return output;
    }
}
