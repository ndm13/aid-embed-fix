import {config} from "./config.ts";

export type IdentityKitCredentials = {
    kind: string;
    idToken: string;
    refreshToken: string;
    expiresIn: string;
    localId: string;
};
export type RefreshTokenResponse = {
    expires_in: string;
    token_type: string;
    refresh_token: string;
    id_token: string;
    user_id: string;
    project_id: string;
};
export type GraphQLQuery = {
    operationName: string;
    variables: Record<string, any>;
    query: string;
};

export class AIDungeonAPI {
    private _token: string;
    public get firebaseToken() {
        return this._token;
    }
    private _refresh: string;
    private _expires: number;
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

    async query(gql: GraphQLQuery) {
        await this.keepTokenAlive();
        return (await fetch(config.client.gqlEndpoint, {
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
    }

    async getScenario(shortId: string) {
        return (await this.query({
            operationName: "GetScenario",
            variables: { "shortId": shortId },
            query:
                "query GetScenario($shortId: String) {  scenario(shortId: $shortId) {    createdAt    editedAt    title    description    prompt    image    published    unlisted    publishedAt    commentCount    voteCount    saveCount    storyCardCount    tags    adventuresPlayed    thirdPerson    nsfw    contentRating    contentRatingLockedAt    user {      isMember      profile {        title        thumbImageUrl      }    }    ...CardSearchable  }}fragment CardSearchable on Searchable {  title  description  image  tags  voteCount  published  unlisted  publishedAt  createdAt  editedAt  deletedAt  blockedAt  saveCount  commentCount  contentRating  user {    isMember    profile {      title      thumbImageUrl    }  }  ... on Adventure {    actionCount    userJoined    unlisted    playerCount  }  ... on Scenario {    adventuresPlayed    contentResponses {      isSaved      isDisliked    }  }}",
        }))?.data?.scenario;
    }

    async getAdventure(shortId: string) {
        return (await this.query({
            operationName: "GetAdventure",
            variables: {"shortId": shortId},
            query: "query GetAdventure($shortId: String) {  adventure(shortId: $shortId) {    createdAt    editedAt    title    description    image    actionCount    published    unlisted    commentCount    voteCount    saveCount    storyCardCount    thirdPerson    nsfw    contentRating    contentRatingLockedAt    tags    user {      isMember      profile {        title        thumbImageUrl      }    }    scenario {      title      published      deletedAt      }    ...CardSearchable  }}fragment CardSearchable on Searchable {  title  description  image  tags  voteCount  published  unlisted  publishedAt  createdAt  editedAt  deletedAt  blockedAt  saveCount  commentCount  userId  contentRating  user {    isMember    profile {      title      thumbImageUrl    }  }  ... on Adventure {    actionCount    unlisted    playerCount  }  ... on Scenario {    adventuresPlayed  }}"
        }))?.data?.adventure;
    }

    async getUser(username: string) {
        return (await this.query({
            operationName: "ProfileScreenGetUser",
            variables: {"username": username},
            query: "query ProfileScreenGetUser($username: String) {  user(username: $username) {    profile {      thumbImageUrl    }    ...ProfileHeaderUser    ...ProfileMobileHeaderUser  }}fragment ProfileHeaderUser on User {  isMember  friendCount  followingCount  followersCount  profile {    title    description    thumbImageUrl  }  ...SocialStatMenuUser  }fragment SocialStatMenuUser on User {  profile {    title  }}fragment ProfileMobileHeaderUser on User {  friendCount  followingCount  followersCount  isMember  profile {    title    description    thumbImageUrl  }  ...SocialStatMenuUser}"
        }))?.data?.user;
    }

    private async keepTokenAlive() {
        const now = Date.now();
        if (now > this._expires) {
            // Already expired: generate a new token if guest, otherwise error out
            if (this._guest) {
                const replace = await AIDungeonAPI.getNewGuestToken();
                this._token = replace.idToken;
                this._refresh = replace.refreshToken;
                this._expires = Date.now() + (Number.parseInt(replace.expiresIn) * 1000);
                console.info("Created new user token");
            } else {
                throw new Error(
                    "Non-guest API token expired, unable to refresh token",
                );
            }
        } else if (this._expires - now < 36000000) {
            // Less than five minutes left, refresh
            const refresh = await this.refreshToken();
            this._token = refresh.id_token;
            this._refresh = refresh.refresh_token;
            this._expires = Date.now() + (Number.parseInt(refresh.expires_in) * 1000);
            console.info("Refreshed user token");
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
                "body": "grant_type=refresh_token&refresh_token=" +
                    this._refresh,
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
}
