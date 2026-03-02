<script lang="ts">
    function getCookie(name: string): string | null {
        if (typeof document === 'undefined') return null;
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) {
            const val = parts.pop()?.split(';').shift();
            return val ? decodeURIComponent(val) : null;
        }
        return null;
    }

    function setCookie(name: string, value: string) {
        if (typeof document === 'undefined') return;
        const maxAge = 60 * 60 * 24 * 365; // 1 year

        let domain = window.location.hostname;
        const parts = domain.split('.');
        // Set cookie on root domain (e.g. .aidungeon.link) to share with subdomains
        if (parts.length > 1 && !domain.includes("localhost") && !domain.match(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/)) {
            domain = parts.slice(-2).join('.');
        }

        document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax; domain=.${domain}`;
    }

    interface LinkSettings {
        env: string;
        domain: string;
        preferExisting: boolean;
    }

    interface ProxySettings {
        env: string;
    }

    function loadSettings<T>(name: string, defaultValue: T): T {
        const val = getCookie(name);
        if (val) {
            try {
                return { ...defaultValue, ...JSON.parse(val) };
            } catch {
                // ignore
            }
        }
        return defaultValue;
    }

    let linkSettings = $state<LinkSettings>(loadSettings("link_settings", {
        env: "",
        domain: "aidungeon.link",
        preferExisting: false
    }));

    let proxySettings = $state<ProxySettings>(loadSettings("proxy_settings", {
        env: ""
    }));

    function saveLinkSettings(e: Event) {
        e.preventDefault();
        setCookie("link_settings", JSON.stringify(linkSettings));
    }

    function saveProxySettings(e: Event) {
        e.preventDefault();
        setCookie("proxy_settings", JSON.stringify(proxySettings));
    }

    function getOtherDomain() {
        if (typeof window === 'undefined') return null;
        const host = window.location.hostname;
        if (host.includes("aidungeon.link")) return "axdungeon.com";
        if (host.includes("axdungeon.com")) return "aidungeon.link";
        return null;
    }

    const otherDomain = getOtherDomain();

    function syncToOther() {
        if (!otherDomain) return;
        const linkJson = JSON.stringify(linkSettings);
        const proxyJson = JSON.stringify(proxySettings);

        // Replace current root domain with other domain
        const currentRoot = window.location.hostname.split('.').slice(-2).join('.');
        const newHost = window.location.hostname.replace(currentRoot, otherDomain);

        const url = new URL(window.location.href);
        url.hostname = newHost;
        url.pathname = "/sync";
        url.searchParams.set("sync_link", linkJson);
        url.searchParams.set("sync_proxy", proxyJson);
        window.location.href = url.toString();
    }
</script>

<main>
    <form onsubmit={saveLinkSettings}>
        <h3>Link Builder Settings</h3>

        <h4>Defaults</h4>
        <div class="grid-section">
            <label for="link-env">
                Use this environment for links:
            </label>
            <select id="link-env" bind:value={linkSettings.env}>
                <option value="">Link Default (do not override)</option>
                <option value="prod">Production (play.)</option>
                <option value="beta">Beta (beta.)</option>
                <option value="alpha">Alpha (alpha.)</option>
            </select>
            <label for="link-domain">
                Use this embed fix domain for links:
            </label>
            <select id="link-domain" bind:value={linkSettings.domain}>
                <option value="aidungeon.link">aidungeon.link</option>
                <option value="axdungeon.com">axdungeon.com</option>
            </select>
            <label>
                <input type="checkbox" bind:checked={linkSettings.preferExisting}/>
                If editing an existing link, prefer the embed fix domain in use
            </label>
        </div>
        <div class="actions">
            <button type="submit">Save Link Settings</button>
        </div>
    </form>

    <form onsubmit={saveProxySettings}>
        <h3>Proxy Settings</h3>

        <h4>Navigation</h4>
        <div class="grid-section">
            <label for="proxy-env">
                Use this environment for navigation:
            </label>
            <select id="proxy-env" bind:value={proxySettings.env}>
                <option value="">Link Default (do not override)</option>
                <option value="prod">Production (play.)</option>
                <option value="beta">Beta (beta.)</option>
                <option value="alpha">Alpha (alpha.)</option>
            </select>
        </div>
        <div class="actions">
            <button type="submit">Save Proxy Settings</button>
        </div>
    </form>

    {#if otherDomain}
        <div class="sync-section">
            <h3>Sync Settings</h3>
            <p>
                You are currently on {window.location.hostname}.
                You can sync these settings to {otherDomain}.
            </p>
            <button onclick={syncToOther}>
                Save & Sync to {otherDomain}
            </button>
        </div>
    {/if}
</main>


<style>
    main {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        gap: 2rem;
    }
    form, .sync-section {
        width: min-content;
        flex-grow: 1;
        display: flex;
        flex-direction: column;
    }
    .sync-section {
        border-top: 1px solid #ccc;
        padding-top: 1rem;
        width: 100%;
    }
    .grid-section {
        grid-template-columns: 1fr max-content;
    }
    label {
        min-width: 12em;
    }
    .actions {
        margin-top: 1rem;
        display: flex;
        justify-content: flex-end;
        gap: 0.5rem;
    }

    @media (width < 30em) {
        .grid-section {
            width: max-content;
            max-width: calc(100vw - 3rem);
        }

        .grid-section > * {
            grid-column: span 2;
        }
    }
</style>