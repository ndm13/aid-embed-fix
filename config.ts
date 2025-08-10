import { parseArgs } from "jsr:@std/cli/parse-args";
const flags = parseArgs(Deno.args, {
    string: [
        "firebaseITK",
        "firebaseClientVersion",
        "firebaseClientToken",
        "origin",
        "gqlEndpoint",
        "userAgent",
        "oembedProtocol",
        "listen"
    ]
})

export const config = {
    // These settings are for connecting to Firebase for authentication.
    // The defaults are used for the origin https://play.aidungeon.com.
    firebase: {
        // This is passed as the `key=` parameter for Firebase auth requests.
        identityToolkitKey:
            flags.firebaseITK ||
            Deno.env.get("FIREBASE_ITK") ||
            "AIzaSyCnvo_XFPmAabrDkOKBRpbivp5UH8r_3mg",
        // This is passed as the X-Client-Version header for Firebase auth requests.
        clientVersion:
            flags.firebaseClientVersion ||
            Deno.env.get("FIREBASE_CLIENT_VERSION") ||
            "Firefox/JsCore/10.8.0/FirebaseCore-web",
        // This is passed as the X-Firebase-Client header for Firebase auth requests.
        clientToken:
            flags.firebaseClientToken ||
            Deno.env.get("FIREBASE_CLIENT_TOKEN") ||
            "eyJ2ZXJzaW9uIjoyLCJoZWFydGJlYXRzIjpbeyJhZ2VudCI6ImZpcmUtY29yZS8wLjExLjQgZmlyZS1jb3JlLWVzbTIwMTcvMC4xMS40IGZpcmUtanMvIGZpcmUtYXV0aC8xLjEwLjAgZmlyZS1hdXRoLWVzbTIwMTcvMS4xMC4wIGZpcmUtanMtYWxsLWFwcC8xMS42LjAiLCJkYXRlcyI6WyIyMDI1LTA4LTA2Il19XX0",
    },
    // These settings are used for connections from this server to AID/Firebase.
    // URLs should omit the trailing slash.
    client: {
        // This is used as the origin for all Firebase requests, the referrer
        // for all GraphQL requests, and the hostname for all redirects (unless
        // overridden by a hostname prefix).
        origin:
            flags.origin ||
            Deno.env.get("ORIGIN") ||
            "https://play.aidungeon.com",
        // This is the endpoint for all GraphQL queries.
        gqlEndpoint:
            flags.gqlEndpoint ||
            Deno.env.get("GQL_ENDPOINT") ||
            "https://api.aidungeon.com/graphql",
        // This is the user agent that will be used for all requests.
        userAgent:
            flags.userAgent ||
            Deno.env.get("USER_AGENT") ||
            "AIDungeonEmbedFix/dev-build +(https://github.com/ndm13/aid-embed-fix)"
    },
    // These settings are used for implementation details around networking.
    network: {
        // When running behind some reverse proxies, protocol detection can
        // return an http link instead of https. This ensures that the links to
        // oembed.json use the correct protocol.
        oembedProtocol:
            flags.oembedProtocol ||
            Deno.env.get("OEMBED_PROTOCOL") ||
            "https",
        // The interface to use for incoming requests.
        listen:
            flags.listen ||
            Deno.env.get("LISTEN") ||
            "0.0.0.0:8000"
    }
};