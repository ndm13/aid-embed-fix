// deno-lint-ignore-file no-explicit-any
import { GraphQLQuery, GraphQLResponse } from "../types/AIDungeonAPITypes.ts";

export class AIDungeonAPIError extends Error {
    readonly query: GraphQLQuery;
    readonly response?: GraphQLResponse<string, any>;

    private constructor(message: string, query: GraphQLQuery, response?: GraphQLResponse<string, any>) {
        super(message);
        this.name = "AIDungeonAPIError";
        this.query = query;
        this.response = response;
    }

    static isInstance(obj: any): obj is AIDungeonAPIError {
        return obj instanceof AIDungeonAPIError;
    }

    static onUnpack(message: string, query: GraphQLQuery, response: GraphQLResponse<string, any>) {
        return new AIDungeonAPIError(message, query, response);
    }

    static onRequest(message: string, query: GraphQLQuery, cause: any) {
        const error = new AIDungeonAPIError(message, query, undefined);
        error.cause = cause;
        return error;
    }
}
