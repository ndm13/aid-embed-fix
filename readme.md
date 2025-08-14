# Better AI Dungeon Embeds
[![Release status](https://github.com/ndm13/aid-embed-fix/actions/workflows/release.yml/badge.svg)](https://github.com/ndm13/aid-embed-fix/actions/workflows/release.yml)
[![Check for Deno Updates](https://github.com/ndm13/aid-embed-fix/actions/workflows/update-deps.yml/badge.svg)](https://github.com/ndm13/aid-embed-fix/actions/workflows/update-deps.yml)
![axdungeon.com status](https://img.shields.io/website?url=https%3A%2F%2Faxdungeon.com%2Fhealthcheck&logo=digitalocean&label=axdungeon.com&cacheSeconds=300)
![aidungeon.link status](https://img.shields.io/website?url=https%3A%2F%2Faidungeon.link%2Fhealthcheck&logo=digitalocean&label=aidungeon.link&cacheSeconds=300)

Tired of your AI Dungeon links having zero usable information? This link fixer will give your embeds the detail they
deserve! Works for user profiles, scenarios, and adventures!

Running on `play.axdungeon.com`/`beta.axdungeon.com` (type `s/i/x` after posting a link) and `play.aidungeon.link`/
`beta.aidungeon.link` (replace the `.com` with `.link`)!

<img alt="A demo video showing posting a scenario link, typing s/i/x, then the link changing to the better embed version" src="/screenshots/sixfix_demo.gif" style="max-height:450px"/>

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
| Firebase Client Version       | `--firebaseClientVersion` | `FIREBASE_CLIENT_VERSION` | This is passed as the `X-Client-Version` header for Firebase auth requests.                                                                                                                                                       |
| Firebase Client Token         | `--firebaseClientToken`   | `FIREBASE_CLIENT_TOKEN`   | This is passed as the `X-Firebase-Client` header for Firebase auth requests.                                                                                                                                                      |
| Origin/Referrer               | `--origin`                | `ORIGIN`                  | This is used as the origin for all Firebase requests, the referrer for all GraphQL requests, and the hostname for all redirects (unless overridden by a hostname prefix).                                                         |
| GraphQL Endpoint              | `--gqlEndpoint`           | `GQL_ENDPOINT`            | This is the endpoint for all GraphQL queries.                                                                                                                                                                                     |
| User Agent                    | `--userAgent`             | `USER_AGENT`              | This is the user agent that will be used for all requests. Docker images will assign the correct version number on build.                                                                                                         |
| OEmbed Protocol               | `--oembedProtocol`        | `OEMBED_PROTOCOL`         | When running behind some reverse proxies, protocol detection can return an http link instead of https. This ensures that the links to oembed.json use the correct protocol. **Change this to http if serving the app over http.** |
| Listening Interface           | `--listen`                | `LISTEN`                  | The interface to use for incoming requests.                                                                                                                                                                                       |

Note that when changing environments, you will likely need different Firebase credentials (ITK and Token) as each
instance authenticates as a separate app. Each environment also uses a separate GraphQL endpoint.

When the server launches, it will print the interface and port on which it's listening. Query `/healthcheck` to get
stats!

## Technical Details
There are two core components to the project: the [AI Dungeon API](/AIDungeonAPI.ts) and an 
[Oak middleware webserver](/server.ts) (plus a global [config file](/config.ts) to tie it all together).

The AI Dungeon API was reverse engineered from authentication/GraphQL queries on `play.aidungeon.com`. These queries
have been stripped to retrieve a minimal amount of information - much less than a typical page load. Firebase sessions
are reduced by keeping an anonymous session active during high use times and letting it expire/creating a new one
during off-peak hours. The design is otherwise completely stateless: no persistent storage, easy scalability.

Requests are redirected to the origin site when possible. When a page is requested by a non-Discord user agent, a 301
redirect is issued (this behavior can be bypassed by adding `no_ua` as a query parameter, if testing another platform).
If the page *is* loaded by a browser, a JavaScript redirect will take place immediately, with history replacement. And
if for some reason all logic fails and the user sees the page we present to Discord, it still looks nice enough.

### Query Parameters
We pass `share` for profile, scenario, and adventure queries, and `contentType` for profile queries. All other query
parameters are discarded when forwarding the request.

## For Contributors
My biggest blind spot is testing. Discord is a big community for AI Dungeon, but I'm sure there are other platforms
where links are shared with subpar embeds. Please go ahead and test them (with `?no_ua` on the end) and let me know if
they work well or need additional properties. I'm open for pull requests too, if anyone wants to put in some work!
