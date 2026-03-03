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

<svelte:head>
    <title>Settings | AI Dungeon Embed Fix</title>
</svelte:head>

<main>
    <form onsubmit={saveLinkSettings} class="settings-card">
        <header>
            <h3>Link Builder</h3>
            <p class="subtitle">Default behavior when editing links.</p>
        </header>

        <div class="settings-group">
            <div class="setting-item">
                <label for="link-env">Default Environment</label>
                <select id="link-env" bind:value={settings.link.env}>
                    <option value="">The environment in the link</option>
                    <option value="prod">Production (play.)</option>
                    <option value="beta">Beta (beta.)</option>
                    <option value="alpha">Alpha (alpha.)</option>
                </select>
            </div>

            <div class="setting-item">
                <label for="link-domain">Default Domain</label>
                <select id="link-domain" bind:value={settings.link.domain}>
                    <option value="aidungeon.link">aidungeon.link</option>
                    <option value="axdungeon.com">axdungeon.com</option>
                </select>
            </div>

            <div class="setting-item checkbox-item">
                <label>
                    <input type="checkbox" bind:checked={settings.link.preferExisting}/>
                    <span>If editing an existing link, prefer its original settings</span>
                </label>
            </div>
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

    <form onsubmit={saveProxySettings} class="settings-card">
        <header>
            <h3>Proxy</h3>
            <p class="subtitle">Default behavior when opening links.</p>
        </header>

        <div class="settings-group">
            <div class="setting-item">
                <label for="proxy-env">Default Environment</label>
                <select id="proxy-env" bind:value={settings.proxy.env}>
                    <option value="">The environment in the link</option>
                    <option value="prod">Production (play.)</option>
                    <option value="beta">Beta (beta.)</option>
                    <option value="alpha">Alpha (alpha.)</option>
                </select>
            </div>

            <div class="setting-item">
                <label for="proxy-landing">Landing Page</label>
                <select id="proxy-landing" bind:value={settings.proxy.landing}>
                    <option value="">Redirect server-side when possible (default)</option>
                    <option value="client">Always redirect client-side (fixes stuck links)</option>
                    <option value="preview">Show a card preview with a clickable link</option>
                </select>
            </div>
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
        flex-wrap: wrap;
        gap: 1.5rem;
        width: 100%;
        align-items: stretch;
    }

    .settings-card {
        box-sizing: border-box;
        flex: 1 1 350px;
        min-width: 0;

        display: flex;
        flex-direction: column;
        gap: 1.5rem;
        padding: 1.5rem;
        border: 1px solid #222;
        border-radius: 6px;
        background-color: rgba(0, 0, 0, 0.02);
    }

    header h3 {
        margin: 0 0 0.25rem 0;
    }

    .subtitle {
        margin: 0;
        font-size: 0.85rem;
        opacity: 0.7;
    }

    .settings-group {
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
        flex-grow: 1;
    }

    .setting-item {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .setting-item label {
        font-weight: 500;
        font-size: 0.95rem;
    }

    .checkbox-item {
        margin-top: 0.5rem;
    }

    .checkbox-item label {
        display: flex;
        align-items: flex-start;
        gap: 0.5rem;
        font-weight: normal;
        cursor: pointer;
    }

    .actions {
        display: flex;
        justify-content: flex-end;
        align-items: center;
        gap: 1rem;
        margin-top: 1rem;
        padding-top: 1.5rem;
        border-top: 1px solid rgba(128, 128, 128, 0.2);
    }

    .status-message {
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

    @media (width >= 35em) {
        .setting-item:not(.checkbox-item) {
            flex-direction: row;
            justify-content: space-between;
            align-items: center;
        }

        .setting-item select {
            width: max-content;
            min-width: 50%;
            max-width: 60%;
        }
    }
</style>