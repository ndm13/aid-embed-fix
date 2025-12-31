<script lang="ts">
    const HOSTNAME_PATTERN = /^(?<prefix>(play|beta|alpha)\.)(?<tld>aidungeon\.(com|link)|axdungeon\.com)$/;
    const PATHNAME_PATTERN = /^(?<path>\/(?:(?<type>scenario|adventure)\/(?<id>[\w-]+)\/[^?\s]+|(?<type>profile)\/(?<id>[\w-]+))$)/;

    let source = $state("");

    let prefix = $state('play.');
    let tld = $state('aidungeon.link');
    let shareId = $state('');

    let coverLink = $state("");
    let noCover = $state(false);

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
                if (['axdungeon.com', 'aidungeon.link'].includes(hostMatch.groups.tld)) {
                    tld = hostMatch.groups.tld;
                }
            }
            if (s.searchParams.has('shareId')) {
                shareId = s.searchParams.get('shareId');
            }
            if (s.searchParams.has('cover')) {
                let coverParam = s.searchParams.get('cover');
                if (coverParam.includes(':')) {
                    const [platform, file] = coverParam.split(':');
                    switch (platform) {
                        case 'catbox':
                            coverLink = "https://files.catbox.moe/" + file.replace(/^\/+/, "");
                            break;
                        case 'imgur':
                            coverLink = "https://imgur.com/" + file.replace(/^\/+/, "");
                            break;
                    }
                }
            }
        } catch { }
    });

    let cover = $derived.by(() => {
        if (noCover) return "none";
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

    let coverInvalid = $derived(!noCover && coverLink !== "" && cover === "");

    let coverInput: HTMLInputElement | undefined = $state();
    $effect(() => {
        coverInput?.setCustomValidity(coverInvalid ? "Supports Catbox and Imgur links" : "");
    });

    let url = $derived.by(() => {
        if (!path || !prefix || !tld) return undefined;
        try {
            const u = new URL(`https://${prefix}${tld}`);
            u.pathname = path;

            if (shareId) {
                u.searchParams.set('shareId', shareId);
            }
            if (cover) {
                u.searchParams.set('cover', cover);
            }
            return u;
        } catch {
            return undefined;
        }
    });

    function generateRandomId() {
        shareId = Math.random().toString(16).slice(2, 10);
    }
</script>

<form>
    <p>
        <label>
            Source URL:
            <input type="text" bind:value={source} size="50" />
        </label>
    </p>

    <label>
        Base Domain:
        <select bind:value={prefix}>
            <option value="play.">play.</option>
            <option value="beta.">beta.</option>
            <option value="alpha.">alpha.</option>
        </select>
        <select bind:value={tld}>
            <option value="aidungeon.link">aidungeon.link</option>
            <option value="axdungeon.com">axdungeon.com</option>
        </select>
    </label>
    <br/>
    <label>
        Share ID:
        <input type="text" bind:value={shareId} />
        <button type="button" onclick={generateRandomId}>Generate</button>
    </label>
    <br/>
    <label>
        Custom cover:
        <input type="text" bind:this={coverInput} bind:value={coverLink} placeholder="https://files.catbox.moe/ecb5xa.png" disabled={noCover} onblur={() => !noCover && coverInput?.reportValidity()} />
    </label>
    <label>
        <input type="checkbox" bind:checked={noCover} />
        No Cover
    </label>

    {#if url}
        <p>
            <label>
                Generated URL:
                <input type="text" value={url.href} readonly size="50" />
            </label>
        </p>
    {/if}
</form>