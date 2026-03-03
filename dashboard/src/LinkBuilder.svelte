<script lang="ts">
    import { settings } from "./settings.svelte.ts";
    import { untrack } from "svelte";

    const HOSTNAME_PATTERN = /^(?<prefix>(play|beta|alpha)\.)(?<tld>aidungeon\.(com|link)|axdungeon\.com)$/;
    const PATHNAME_PATTERN = /^(?<path>\/(?:(?<type>scenario|adventure)\/(?<id>[\w-]+)\/[^?\s]+|(?<type>profile)\/(?<id>[\w-]+))$)/;

    interface Props {
        generatedLink?: URL;
        visibility?: 'published' | 'unlisted';
    }

    let {
        generatedLink = $bindable(),
        visibility = $bindable()
    }: Props = $props();

    let source = $state("");

    function getEnvPrefix(env: string) {
        switch (env) {
            case 'prod': return 'play.';
            case 'beta': return 'beta.';
            case 'alpha': return 'alpha.';
            default: return 'play.';
        }
    }

    let prefix = $state(settings.link.env ? getEnvPrefix(settings.link.env) : 'play.');
    let tld = $state(settings.link.domain || 'aidungeon.link');
    let shareId = $state('');

    let coverLink = $state("");
    let coverMode = $state<'default' | 'none' | 'custom'>('default');

    let sourceUrl = $derived.by(() => {
        if (!source) return undefined;
        try {
            const url = new URL(source);
            if (!HOSTNAME_PATTERN.test(url.hostname)) return undefined;
            return url;
        } catch {
            return undefined;
        }
    });

    let pathData = $derived.by(() => {
        if (!sourceUrl) return {};
        return PATHNAME_PATTERN.exec(sourceUrl.pathname)?.groups || {};
    }) as Partial<{ path: string, type: string, id: string }>;

    const pathKey = $derived(pathData.id && pathData.type ? `${pathData.type}/${pathData.id}` : undefined);
    $effect(() => {
        // When the pathKey changes (i.e. a new scenario/adventure is pasted),
        // reset the visibility if the new URL doesn't specify it.
        pathKey;
        untrack(() => {
            if (sourceUrl && !sourceUrl.searchParams.has('published') && !sourceUrl.searchParams.has('unlisted')) {
                visibility = undefined;
            }
        });
    });

    $effect(() => {
        if (!sourceUrl) return;

        const hostMatch = HOSTNAME_PATTERN.exec(sourceUrl.hostname);
        if (hostMatch) {
            const linkPrefix = hostMatch.groups.prefix;
            const linkTld = hostMatch.groups.tld;
            const isProxied = ['axdungeon.com', 'aidungeon.link'].includes(linkTld);

            if (settings.link.preferExisting) {
                prefix = linkPrefix;
                if (isProxied) {
                    tld = linkTld;
                }
            } else {
                if (settings.link.env) {
                    prefix = getEnvPrefix(settings.link.env);
                } else {
                    prefix = linkPrefix;
                }

                if (settings.link.domain) {
                    tld = settings.link.domain;
                } else if (isProxied) {
                    tld = linkTld;
                }
            }

            if (!isProxied && !settings.link.domain) {
                const currentMatch = HOSTNAME_PATTERN.exec(new URL(document.URL).hostname);
                // If we're on a recognizable proxied domain, use that domain
                if (currentMatch && ['axdungeon.com', 'aidungeon.link'].includes(currentMatch.groups.tld)) {
                    tld = currentMatch.groups.tld;
                }
            }
        }
        if (sourceUrl.searchParams.has('shareId')) {
            shareId = sourceUrl.searchParams.get('shareId')!;
        }
        if (sourceUrl.searchParams.has('cover')) {
            let coverParam = sourceUrl.searchParams.get('cover')!;
            if (coverParam === 'none') {
                coverMode = 'none';
            } else if (coverParam.includes(':')) {
                const [platform, file] = coverParam.split(':');
                switch (platform) {
                    case 'catbox':
                        coverLink = "https://files.catbox.moe/" + file.replace(/^\/+/, "");
                        coverMode = 'custom';
                        break;
                    case 'imgur':
                        coverLink = "https://imgur.com/" + file.replace(/^\/+/, "");
                        coverMode = 'custom';
                        break;
                }
            }
        } else {
            coverMode = 'default';
        }
        if (sourceUrl.searchParams.get('published')) {
            visibility = 'published';
        } else if (sourceUrl.searchParams.get('unlisted')) {
            visibility = 'unlisted';
        }
    });

    let cover = $derived.by(() => {
        if (pathData.type === "profile") return "";
        if (coverMode === 'default') return "";
        if (coverMode === 'none') return "none";
        if (!coverLink) return "";
        try {
            const coverUrl = new URL(coverLink);
            switch (coverUrl.hostname) {
                case "files.catbox.moe":
                    return "catbox:" + coverUrl.pathname.substring(1);
                case "imgur.com":
                case "i.imgur.com":
                    return "imgur:" + coverUrl.pathname.substring(1);
            }
        } catch { }
        return "";
    });

    let coverInvalid = $derived(coverMode === 'custom' && coverLink !== "" && cover === "");

    let coverInput: HTMLInputElement | undefined = $state();
    $effect(() => {
        coverInput?.setCustomValidity(coverInvalid ? "Supports Catbox and Imgur links" : "");
    });

    $effect(() => {
        if (!pathData.path || !prefix || !tld) {
            generatedLink = undefined;
            return;
        }
        try {
            const u = new URL(`https://${prefix}${tld}`);
            u.pathname = pathData.path;

            if (shareId) {
                u.searchParams.set('shareId', shareId);
            }
            if (cover) {
                u.searchParams.set('cover', cover);
            }
            if (pathData.type !== "profile") {
                if (visibility === 'published') {
                    u.searchParams.set('published', 'true');
                } else if (visibility === 'unlisted') {
                    u.searchParams.set('unlisted', 'true');
                }
            }
            generatedLink = u;
        } catch {
            generatedLink = undefined;
        }
    });

    function generateRandomId() {
        shareId = Math.random().toString(16).slice(2, 10);
    }
</script>

<form>
    <div class="grid-section">
        <label for="source">Original Link:</label>
        <input id="source" type="text" bind:value={source} />
    </div>

    <details>
        <summary>Advanced</summary>
        <div class="detail-container grid-section">
            <label for="prefix">Domain:</label>
            <div class="hinted">
                <div class="row">
                    <select id="prefix" bind:value={prefix}>
                        <option value="play.">play.</option>
                        <option value="beta.">beta.</option>
                        <option value="alpha.">alpha.</option>
                    </select>
                    <select bind:value={tld} aria-label="TLD">
                        <option value="aidungeon.link">aidungeon.link</option>
                        <option value="axdungeon.com">axdungeon.com</option>
                    </select>
                </div>
                <small>
                    Set the default environment/service.
                </small>
            </div>
            <label for="shareId">Share ID:</label>
            <div class="hinted">
                <div class="row">
                    <input id="shareId" type="text" bind:value={shareId} placeholder="e.g. 'aid-discord', 'cool-subreddit'" />
                    <button type="button" class="emoji" onclick={generateRandomId} aria-label="Generate random ID" title="Generate random ID">🔀</button>
                </div>
                <small>Group clicks of the same link in <a target="_blank" href="https://exwjwjqg.budibase.app/app/ai-dungeon-link-analytics/creator-analytics">Creator Dashboard</a>.</small>
            </div>

            {#if pathData.type !== "profile"}
                <span>Cover Art:</span>
                <div class="hinted">
                    <div class="radio-group">
                        <label>
                            <input type="radio" bind:group={coverMode} value="default" />
                            Default
                        </label>
                        <label>
                            <input type="radio" bind:group={coverMode} value="none" />
                            None
                        </label>
                        <label>
                            <input type="radio" bind:group={coverMode} value="custom" />
                            Custom...
                        </label>
                    </div>
                    <small>
                        {#if coverMode === 'default'}
                            Use the cover from AI Dungeon.
                        {:else if coverMode === 'none'}
                            Do not show a cover.
                        {/if}
                    </small>
                </div>
                {#if coverMode === 'custom'}
                <span class="hinted customCoverHint">
                    <input aria-label="custom cover" id="coverLink" type="text" bind:this={coverInput} bind:value={coverLink} placeholder="https://files.catbox.moe/ecb5xa.png" onblur={() => coverInput?.reportValidity()} />
                    <small>Supports <a target="_blank" href="https://imgur.com/upload">Imgur</a> and <a target="_blank" href="https://catbox.moe/">Catbox</a> links.</small>
                </span>
                {/if}

                <span>Visibility:</span>
                <div class="hinted">
                    <div class="radio-group">
                        <label>
                            <input type="radio" bind:group={visibility} value="published" />
                            Published
                        </label>
                        <label>
                            <input type="radio" bind:group={visibility} value="unlisted" />
                            Unlisted
                        </label>
                    </div>
                    <small>
                        {#if visibility === 'published'}
                            This {pathData.type} is published.
                        {:else if visibility === 'unlisted'}
                            This {pathData.type} is unlisted.
                        {:else}
                            The {pathData.type} may be published or unlisted. We will try to figure this out for you, but if you know, you should choose one of the above!
                        {/if}
                    </small>
                </div>
            {/if}
        </div>
    </details>
</form>
