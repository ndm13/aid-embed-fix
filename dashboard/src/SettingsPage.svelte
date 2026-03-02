<script lang="ts">
    import { settings } from "./settings.svelte.ts";

    let activeScope = $state<'link' | 'proxy' | null>(null);

    function saveLinkSettings(e: Event) {
        e.preventDefault();
        activeScope = 'link';
        settings.saveLink();
        settings.sync("link");
    }

    function saveProxySettings(e: Event) {
        e.preventDefault();
        activeScope = 'proxy';
        settings.saveProxy();
        settings.sync("proxy");
    }
</script>

<main>
    <form onsubmit={saveLinkSettings}>
        <h3>Link Builder Settings</h3>

        <h4>When editing links...</h4>
        <div class="grid-section">
            <label for="link-env">
                ...the default environment should be:
            </label>
            <select id="link-env" bind:value={settings.link.env}>
                <option value="">The environment in the link</option>
                <option value="prod">Production (play.)</option>
                <option value="beta">Beta (beta.)</option>
                <option value="alpha">Alpha (alpha.)</option>
            </select>
            <label for="link-domain">
                ...the default domain should be:
            </label>
            <select id="link-domain" bind:value={settings.link.domain}>
                <option value="aidungeon.link">aidungeon.link</option>
                <option value="axdungeon.com">axdungeon.com</option>
            </select>
            <label>
                <input type="checkbox" bind:checked={settings.link.preferExisting}/>
                <span>
                    If editing an existing link, use that link's settings instead of the above
                </span>
            </label>
        </div>
        <div class="actions">
            {#if activeScope === 'link' && settings.notification}
                <span class="status-message {settings.notification.type}">
                    {settings.notification.message}
                </span>
            {/if}
            <button type="submit" disabled={settings.syncStatus === 'syncing'}>Save Link Settings</button>
        </div>
    </form>

    <form onsubmit={saveProxySettings}>
        <h3>Proxy Settings</h3>

        <h4>When opening links...</h4>
        <div class="grid-section">
            <label for="proxy-env">
                ...the default environment should be:
            </label>
            <select id="proxy-env" bind:value={settings.proxy.env}>
                <option value="">The environment in the link</option>
                <option value="prod">Production (play.)</option>
                <option value="beta">Beta (beta.)</option>
                <option value="alpha">Alpha (alpha.)</option>
            </select>
            <label for="proxy-landing">
                ...the landing page should:
            </label>
            <select id="proxy-landing" bind:value={settings.proxy.landing}>
                <option value="">Redirect server-side when possible (default behavior)</option>
                <option value="client">Always redirect client-side (use this if links get stuck)</option>
                <option value="preview">Show a card preview with a clickable link</option>
            </select>
        </div>
        <div class="actions">
            {#if activeScope === 'proxy' && settings.notification}
                <span class="status-message {settings.notification.type}">
                    {settings.notification.message}
                </span>
            {/if}
            <button type="submit" disabled={settings.syncStatus === 'syncing'}>Save Proxy Settings</button>
        </div>
    </form>
</main>


<style>
    main {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        gap: 2rem;
    }
    form {
        width: min-content;
        flex-grow: 1;
        display: flex;
        flex-direction: column;
    }
    .grid-section {
        grid-template-columns: 1fr max-content;
    }
    label {
        min-width: 12em;
        text-wrap: balance;
    }
    label:has(>input[type=checkbox]) {
        display: flex;
        gap: 1ex;
        align-items: baseline;
        text-wrap: auto;
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

    .status-message {
        align-self: center;
        font-size: 0.875rem;
        font-weight: 500;
        animation: fade-in 0.2s ease-out;
    }

    .status-message.success { color: #16a34a; }
    .status-message.error { color: #dc2626; }
    .status-message.info { color: #2563eb; }

    @keyframes fade-in {
        from { opacity: 0; }
        to { opacity: 1; }
    }
</style>