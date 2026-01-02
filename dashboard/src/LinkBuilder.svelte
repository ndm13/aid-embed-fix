<script lang="ts">
    const HOSTNAME_PATTERN = /^(?<prefix>(play|beta|alpha)\.)(?<tld>aidungeon\.(com|link)|axdungeon\.com)$/;
    const PATHNAME_PATTERN = /^(?<path>\/(?:(?<type>scenario|adventure)\/(?<id>[\w-]+)\/[^?\s]+|(?<type>profile)\/(?<id>[\w-]+))$)/;

    let { generatedLink = $bindable() }: { generatedLink?: URL } = $props();

    let source = $state("");

    let prefix = $state('play.');
    let tld = $state('aidungeon.link');
    let shareId = $state('');

    let coverLink = $state("");
    let coverMode = $state<'default' | 'none' | 'custom'>('default');

    let path = $derived.by(() => {
        if (!source) return '';
        try {
            const s = new URL(source);

            if (!HOSTNAME_PATTERN.test(s.hostname)) return '';

            return PATHNAME_PATTERN.exec(s.pathname)?.groups?.path ?? '';
        } catch {
            return '';
        }
    });

    $effect(() => {
        if (!source) return;
        try {
            const s = new URL(source);
            const hostMatch = HOSTNAME_PATTERN.exec(s.hostname);
            if (hostMatch) {
                prefix = hostMatch.groups.prefix;
                // If we're loading an existing proxied link, use that domain
                if (['axdungeon.com', 'aidungeon.link'].includes(hostMatch.groups.tld)) {
                    tld = hostMatch.groups.tld;
                } else {
                    const currentMatch = HOSTNAME_PATTERN.exec(new URL(document.URL).hostname);
                    // If we're on a recognizable proxied domain, use that domain
                    if (currentMatch && ['axdungeon.com', 'aidungeon.link'].includes(currentMatch.groups.tld)) {
                        tld = currentMatch.groups.tld;
                    }
                }
            }
            if (s.searchParams.has('shareId')) {
                shareId = s.searchParams.get('shareId');
            }
            if (s.searchParams.has('cover')) {
                let coverParam = s.searchParams.get('cover');
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
        } catch { }
    });

    let cover = $derived.by(() => {
        if (coverMode === 'default') return "";
        if (coverMode === 'none') return "none";
        if (!coverLink) return "";
        try {
            const coverUrl = new URL(coverLink);
            switch (coverUrl.hostname) {
                case "files.catbox.moe":
                    return "catbox:" + coverUrl.pathname.substring(1);
                case "imgur.com":
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
        if (!path || !prefix || !tld) {
            generatedLink = undefined;
            return;
        }
        try {
            const u = new URL(`https://${prefix}${tld}`);
            u.pathname = path;

            if (shareId) {
                u.searchParams.set('shareId', shareId);
            }
            if (cover) {
                u.searchParams.set('cover', cover);
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
        <div class="advanced-grid">

            <label for="prefix">Embed Fixer:</label>
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
                    Set the default environment/embed fixer.
                </small>
            </div>
            <label for="shareId">Share ID:</label>
            <div class="hinted">
                <div class="row">
                    <input id="shareId" type="text" bind:value={shareId} />
                    <button type="button" onclick={generateRandomId} aria-label="Generate random ID" title="Generate random ID">🔀</button>
                </div>
                <small>Group clicks of the same link in <a target="_blank" href="https://exwjwjqg.budibase.app/app/ai-dungeon-link-analytics/creator-analytics">Creator Dashboard</a>.</small>
            </div>

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
        </div>
    </details>
</form>

<style>
    form {
        padding-top: 1rem;
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    summary {
        padding: 0.75rem;
        background-color: #333;
        cursor: pointer;
        user-select: none;
        border-radius: 1ex;
    }

    .grid-section, .advanced-grid {
        display: grid;
        grid-template-columns: max-content 1fr;
        gap: 1rem;
        align-items: first baseline;
    }

    .advanced-grid {
        padding: 0.75rem;
        border: 0.1rem dashed #333;
        border-top: none;
        border-radius: 0 0 1ex 1ex;
        background-color: #111;
    }

    .row {
        display: flex;
        gap: 0.5rem;
        align-items: center;
    }

    .row input[type="text"], .row select {
        flex-grow: 1;
    }

    .hinted {
        display: flex;
        flex-direction: column;
    }

    .hinted small {
        color: #ccc;
        font-style: italic;
    }

    .radio-group {
        display: flex;
        align-items: stretch;
        flex-wrap: wrap;
    }

    .radio-group label {
        display: flex;
        flex-grow: 1;
        gap: 0.25rem;
        align-items: last baseline;
        place-items: flex-start stretch;
        width: auto;
        cursor: pointer;
    }

    .customCoverHint {
        grid-column: 2;
    }
</style>