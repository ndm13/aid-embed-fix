# Better AI Dungeon Embeds
[![Release status](https://github.com/ndm13/aid-embed-fix/actions/workflows/release.yml/badge.svg)](https://github.com/ndm13/aid-embed-fix/actions/workflows/release.yml)
[![Check for Deno Updates](https://github.com/ndm13/aid-embed-fix/actions/workflows/update-deps.yml/badge.svg)](https://github.com/ndm13/aid-embed-fix/actions/workflows/update-deps.yml)
[![CodeQL](https://github.com/ndm13/aid-embed-fix/actions/workflows/github-code-scanning/codeql/badge.svg)](https://github.com/ndm13/aid-embed-fix/actions/workflows/github-code-scanning/codeql)
[![Automated Testing](https://github.com/ndm13/aid-embed-fix/actions/workflows/test.yml/badge.svg)](https://github.com/ndm13/aid-embed-fix/actions/workflows/test.yml)
<br>
![axdungeon.com status](https://img.shields.io/website?url=https%3A%2F%2Faxdungeon.com%2Fhealthcheck&logo=digitalocean&label=axdungeon.com&cacheSeconds=300)
![aidungeon.link status](https://img.shields.io/website?url=https%3A%2F%2Faidungeon.link%2Fhealthcheck&logo=digitalocean&label=aidungeon.link&cacheSeconds=300)
[![Discord](https://img.shields.io/discord/1432533980070281228?logo=discord&label=Discord&link=https%3A%2F%2Fdiscord.gg%2FpjHXDsYfR6)](https://discord.gg/pjHXDsYfR6)

Tired of your AI Dungeon links having zero usable information? This link fixer will give your embeds the detail they
deserve! Works for user profiles, scenarios, and adventures!

Running on `play.axdungeon.com`/`beta.axdungeon.com`/`alpha.axdungeon.com` (type `s/i/x` after posting a link) and `play.aidungeon.link`/
`beta.aidungeon.link`/`alpha.aidungeon.link` (replace the `.com` with `.link`)!

Want to get started? Check out the [new dashboard](https://play.aidungeon.link/dashboard)!

![A demo video showing posting a scenario link, typing s/i/x, then the link changing to the better embed version](/screenshots/sixfix_demo.gif)

# Features
## Pretty Embeds on Discord
This is the primary reason to use this service. By default, the embeds don't show much information:

![A screenshot of a Discord embed: title text 'AI Dungeon'; description 'AI Dungeon, an infinitely generated text adventure...'; a small image to the right side showing a screenshot of the homepage](/screenshots/standard.png)

With the embed fixer, people can see the content type, title, and description along with the cover art!

| Type                   | Preview                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
|------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `/scenario/:id/:slug`  | ![A screenshot of a Discord embed: site name 'AI Dungeon Scenario'; author name 'aidungeon'; title text 'Original Quickstart'; description 'The set of classic prompts featuring various characters in Larion, zombie curing scientists and more!'; a large image of an isometric dungeon underneath](/screenshots/original_quickstart.png)                                                                                                                                                                                                                                                                      |
| `/adventure/:id/:slug` | ![A screenshot of a Discord embed: site name 'AI Dungeon Adventure'; author name 'uxbnkuribo'; title text 'An Unforgettable Luncheon with a guest appearance by Chief Wiggum'; description 'Seymour Skinner has Superintendent Chalmers over for an unforgettable luncheon. Only one problem- Chief Wiggum and the Springfield police force show up almost immediately! Will Chief Wiggum's presence hinder Skinner's ability to steam a good ham?'; a large image of Skinner and Chalmers sitting at a table with the Aurora Borealis in the background underneath](/screenshots/an_unforgettable_luncheon.png) |
| `/profile/:username`   | ![A screenshot of a Discord embed: site name 'AI Dungeon Profile': title text 'aidungeon'; description 'Official AI Dungeon account.'; a small image to the right side showing the AI Dungeon logo profile icon'](/screenshots/aidungeon.png)                                                                                                                                                                                                                                                                                                                                                                    |

## Custom Covers
As of `v0.2.1`, you can now override the default cover returned by AI Dungeon. You use an image hosted on [Catbox](https://catbox.moe/)
or [Imgur](https://imgur.com/upload), or remove the image entirely.

| Service | Example Link                          | URL Parameter              | Instructions                                                                                                                                                                                                                                                             |
|---------|---------------------------------------|----------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Catbox  | `https://files.catbox.moe/ecb5xa.png` | `?cover=catbox:ecb5xa.png` | 1. Upload the image of your choosing.<br>2. Click on the URL below the progress bar to copy the link.<br>3. The part of the URL after the `/` is your ID. Add the URL parameter `cover=catbox:[your ID]`, with an optional extension (assumes `.jpg` by default).        |
| Imgur   | `https://imgur.com/G2oq1zB`           | `?cover=imgur:G2oq1zB`     | 1. Upload the image of your choosing.<br>2. Hover your mouse over the image and click the `Copy link` button.<br>3. The part of the URL after the `/` is your ID. Add the URL parameter `cover=imgur:[your ID]`, with an optional extension (assumes `.jpg` by default). |
| None    | n/a                                   | `?cover=none`              | Add the URL parameter `cover=none` to remove the cover art from the embed.                                                                                                                                                                                               |

If the cover service is not valid, or the ID is empty, then the service will show the original cover art instead.

> [!WARNING]
> AI Dungeon uses HIVE and other image content filters to moderate inappropriate content. *This explicitly bypasses
> those filters.* Be aware of the appropriateness of the images you use and where you post them!

## Long Lasting
As of `v0.2.4`, the link fix will make its best effort to figure out whether or not your content is published before
forwarding to AI Dungeon. This means old links created before the publishing flow update will still work if they were
shared using the link fix service!

## Sharing Insights (currently in alpha)
Since the service was already recording metrics to prevent spam and abuse (including passing that along to Latitude), a
pilot program is being built out to share the more useful bits of data. A [platform-wide dashbaord](https://exwjwjqg.budibase.app/app/ai-dungeon-link-analytics/#/all)
is currently in public alpha that tries to answer common questions about AI Dungeon: how much traffic comes from what
rating? How popular is opening links on mobile? Do people share and read adventures? The results may surprise you!

A dashboard for creators is currently in private alpha. [Join the Discord server](https://discord.gg/pjHXDsYfR6) for
early (potentially buggy) access to content-level insights, traffic averages, best publishing times, and more!

# Technical Details
If you're not deploying, building, hacking on, or otherwise neck deep in the source code of this app, none of this
applies to you!

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
```shell
git clone https://github.com/ndm13/aid-embed-fix.git  # or download files manually
cd aid-embed-fix
deno install
deno task dashboard:build # if using the dashboard
deno task compile:server ./src/server.ts
./server
```

### Run the `server.ts` file directly
```shell
git clone https://github.com/ndm13/aid-embed-fix.git  # or download files manually
cd aid-embed-fix
deno install
deno task dashboard:build # if using the dashboard
deno task start
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
| Enabled Metrics               | `--metrics`               | `METRICS`                 | Determines which metrics are in scope. `none` disables capture, `api` or `router` enable those respectively, and `all` enables everything.                                                                                        |
| Metrics Key                   | `--metricsKey`            | `METRICS_KEY`             | A secret URL parameter (?key=) that will be used to access the `/metrics` endpoint. If omitted, a random UUID will be used and output to the console on startup. To disable the key, pass an empty string.                        |
| Log Level                     | `--logLevel`              | `LOG_LEVEL`               | The logging level for the application.                                                                                                                                                                                            |
| Enable Analytics              | `--analytics`             | `ANALYTICS`               | Determines whether analytics will be collected and sent to Supabase.                                                                                                                                                              |
| Supabase URL                  | `--supabaseUrl`           | `SUPABASE_URL`            | The URL of the Supabase instance for analytics ingest.                                                                                                                                                                            |
| Supabase Key                  | `--supabaseKey`           | `SUPABASE_KEY`            | The API key for the Supabase instance for analytics ingest.                                                                                                                                                                       |
| Ingest Secret                 | `--ingestSecret`          | `INGEST_SECRET`           | The secret used by the analytics ingest RPC function.                                                                                                                                                                             |

> [!IMPORTANT]
> If using an environment other than `play`, you will likely need different Firebase credentials (ITK and Token) as each
> instance authenticates as a separate app. Each environment also uses a separate GraphQL endpoint.

When the server launches, it will print the interface and port on which it's listening. Query `/healthcheck` to get
stats!

## Project Structure
- `dashboard`: A Svelte 5 single-page app that generates embeds and allows settings to be stored using cookies.
- `src`: The root directory of the server and healthcheck apps.
  - `api`: A simple library for fetching GraphQL data from AI Dungeon and managing connection state.
  - `handlers`: Business logic for mapping API data to a request.
  - `logging`: Makes the console easy to read.
  - `middleware`: Processes the network requests, adds metadata to context.
  - `support`: Helper classes and functions.
  - `types`: Taking advantage of TypeScript for robust data handling.
- `static`: Files that will directly be served by the app. `dashboard` builds to a subfolder here.
- `templates`: Nunjuck templates for rendering HTML payloads.
- `tests`: Integration-first coverage of functionality.
  - `integration`: Feature-focused tests meant to cover all endpoints with full regression.
  - `unit`: Edge case coverage for critical functionality not easily covered by integration tests.

## Query Parameters
We pass the following query parameters as required by AI Dungeon:

| Parameter      | Used in endpoints         | Purpose                                                                          |
|----------------|---------------------------|----------------------------------------------------------------------------------|
| `share`        | All content items         | Used by AI Dungeon to determine if the link was generated from the Share feature |
| `source`       | Scenarios, Adventures     | Used by AI Dungeon to determine the page the link was shared from                |
| `contentType`  | Profiles                  | Determines the tab to show when opening the profile                              |
| `sort`         | Profiles                  | Determines how the tab's content should be sorted                                |
| `published`    | Scenarios, Adventures     | Determines whether or not the content is published                               |
| `unlisted`     | Scenarios, Adventures     | Determines whether or not the content is unlisted                                |
| `page`, `size` | Adventures (with `/read`) | Determines how far into an adventure the reading view should be                  |

The following parameters are only used by the app and will not be forwarded:

| Parameter | Used in endpoints     | Purpose                                                                                              |
|-----------|-----------------------|------------------------------------------------------------------------------------------------------|
| `no_ua`   | All embed endpoints   | Bypasses the user agent check - treats the connection as coming from Discord                         |
| `preview` | All embed endpoints   | Enables caching (can be busted by changing the value), always renders the page, disables redirection |
| `cover`   | Scenarios, Adventures | Allows manually setting the cover image to be returned in the embed (via Imgur or Catbox)            |

# Project Philosophy
This app should be as unobtrusive as possible to both the end user and to Latitude. To that end, this project
prioritizes:
- **Request minimization:** Cache when it makes sense, persist API user sessions, trim GraphQL payload sizes
- **Don't get in the way:** Redirect with 301 when possible, don't pollute browser history, don't forward custom
  URL parameters
- **Give users what they want:** Better previews, custom covers, reliable links, analytics
- **User autonomy:** No invasive scripts, no extensions, no Discord bots, only essential metadata is collected

> [!NOTE]
> The AI Dungeon API was reverse engineered from authentication/GraphQL queries on `play.aidungeon.com`. Only publicly
> available data was used to make this app.
