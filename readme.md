# Better AI Dungeon Embeds
Tired of your AI Dungeon links having zero usable information? This link fixer will give your embeds the detail they
deserve! Works for user profiles, scenarios, and adventures!

[![Release](https://github.com/ndm13/aid-embed-fix/actions/workflows/release.yml/badge.svg)](https://github.com/ndm13/aid-embed-fix/actions/workflows/release.yml)

## Examples
| Type                   | Default Implementation                                                                                                                                                                                                            | Fixed Version                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
|------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `/scenario/:id/:slug`  | ![A screenshot of a Discord embed: title text 'AI Dungeon'; description 'AI Dungeon, an infinitely generated text adventure...'; a small image to the right side showing a screenshot of the homepage](/screenshots/standard.png) | ![A screenshot of a Discord embed: site name 'AI Dungeon Scenario'; author name 'aidungeon'; title text 'Original Quickstart'; description 'The set of classic prompts featuring various characters in Larion, zombie curing scientists and more!'; a large image of an isometric dungeon underneath](/screenshots/original_quickstart.png)                                                                                                                                                                                                                                                                      |
| `/adventure/:id/:slug` | ![A screenshot of a Discord embed: title text 'AI Dungeon'; description 'AI Dungeon, an infinitely generated text adventure...'; a small image to the right side showing a screenshot of the homepage](/screenshots/standard.png) | ![A screenshot of a Discord embed: site name 'AI Dungeon Adventure'; author name 'uxbnkuribo'; title text 'An Unforgettable Luncheon with a guest appearance by Chief Wiggum'; description 'Seymour Skinner has Superintendent Chalmers over for an unforgettable luncheon. Only one problem- Chief Wiggum and the Springfield police force show up almost immediately! Will Chief Wiggum's presence hinder Skinner's ability to steam a good ham?'; a large image of Skinner and Chalmers sitting at a table with the Aurora Borealis in the background underneath](/screenshots/an_unforgettable_luncheon.png) |
| `/profile/:username`   | ![A screenshot of a Discord embed: title text 'AI Dungeon'; description 'AI Dungeon, an infinitely generated text adventure...'; a small image to the right side showing a screenshot of the homepage](/screenshots/standard.png) | ![A screenshot of a Discord embed: site name 'AI Dungeon Profile': title text 'aidungeon'; description 'Official AI Dungeon account.'; a small image to the right side showing the AI Dungeon logo profile icon'](/screenshots/aidungeon.png)                                                                                                                                                                                                                                                                                                                                                                    |

## Releases
This project is currently being built for Linux, with a `.tar.gz` configured and ready to go on the
[latest release](https://github.com/ndm13/aid-embed-fix/releases/latest). This is used to build a
[Docker image](https://github.com/ndm13/aid-embed-fix/pkgs/container/aid-embed-fix) hosted on `ghcr.io`.

## Deployment
### Docker (preferred)
With Docker Compose or Portainer:
```yml
services:
  aid-embed-fix:
    image: ghcr.io/ndm13/aid-embed-fix
    ports:
      - 8000:8000
    restart: unless-stopped
```
With `docker run`:
```shell
docker run -p 8000:8000 --restart unless-stopped ghcr.io/ndm13/aid-embed-fix
```

### Compile and run locally
The server requires the contents of the `static` and `templates` folders when compiled.
```shell
git clone https://github.com/ndm13/aid-embed-fix.git  # or download files manually
cd aid-embed-fix
deno install
deno compile --allow-env --allow-read --allow-net server.ts
./server
```

### Run the `server.ts` file directly
The server additionally requires the `AIDungeonAPI.ts`, `config.ts`, and `server.ts` files when being run through Deno.
```shell
git clone https://github.com/ndm13/aid-embed-fix.git  # or download files manually
cd aid-embed-fix
deno install
deno run --allow-env --allow-read --allow-net server.ts
```

## Configuration
The defaults provided should work for most deployments. The credentials will authenticate and pull data from the
`play.aidungeon.com` (production) server, but with minimal effort this can be configured to work with the beta server
as well (or hypothetically any other instance that allows anonymous access).

Properties are first checked from the command line, then from environment variables, and finally the default values.
These values are visible in `config.ts`.

| Name                          | Command Line Flag         | Environment Variable      | Description                                                                                                                                                                                                                       |
|-------------------------------|---------------------------|---------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Firebase Identity Toolkit key | `--firebaseITK`           | `FIREBASE_ITK`            | This is passed as the `key=` parameter for Firebase auth requests.                                                                                                                                                                |
| Firebase Client Version       | `--firebaseClientVersion` | `FIREBASE_CLIENT_VERSION` | This is passed as the X-Client-Version header for Firebase auth requests.                                                                                                                                                         |
| Firebase Client Token         | `--firebaseClientToken`   | `FIREBASE_CLIENT_TOKEN`   | This is passed as the X-Firebase-Client header for Firebase auth requests.                                                                                                                                                        |
| Origin/Referrer               | `--origin`                | `ORIGIN`                  | This is used as the origin for all Firebase requests, the referrer for all GraphQL requests, and the hostname for all redirects.                                                                                                  |
| GraphQL Endpoint              | `--gqlEndpoint`           | `GQL_ENDPOINT`            | This is the endpoint for all GraphQL queries.                                                                                                                                                                                     |
| User Agent                    | `--userAgent`             | `USER_AGENT`              | This is the user agent that will be used for all requests. Docker images will assign the correct version number on build.                                                                                                         |
| OEmbed Protocol               | `--oembedProtocol`        | `OEMBED_PROTOCOL`         | When running behind some reverse proxies, protocol detection can return an http link instead of https. This ensures that the links to oembed.json use the correct protocol. **Change this to http if serving the app over http.** |
| Listening Interface           | `--listen`                | `LISTEN`                  | The interface to use for incoming requests.                                                                                                                                                                                       |

Note that when changing environments, you will likely need different Firebase credentials (ITK and Token) as each
instance authenticates as a separate app. Each environment also uses a separate GraphQL endpoint.