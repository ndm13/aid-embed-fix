// deno-lint-ignore-file no-explicit-any
export type IdentityKitCredentials = {
    kind: string,
    idToken: string,
    refreshToken: string,
    expiresIn: string,
    localId: string
};

export type RefreshTokenResponse = {
    expires_in: string,
    token_type: string,
    refresh_token: string,
    id_token: string,
    user_id: string,
    project_id: string
};

export type GraphQLQuery = {
    operationName: string,
    variables: Record<string, any>,
    query: string
};

export type GraphQLResponse<K extends string, T> = {
    data?: Record<K, T>,
    errors?: {
        message: string,
        extensions: Record<string, any>
    }[]
};
