<script lang="ts">
    import { settings } from "./settings.svelte.ts";

    function saveLinkSettings(e: Event) {
        e.preventDefault();
        settings.saveLink();
    }

    function saveProxySettings(e: Event) {
        e.preventDefault();
        settings.saveProxy();
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
                If editing an existing link, use that link's settings instead of the above
            </label>
        </div>
        <div class="actions">
            <button type="submit">Save Link Settings</button>
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
        </div>
        <div class="actions">
            <button type="submit">Save Proxy Settings</button>
        </div>
    </form>

    {#if settings.otherDomain}
        <div class="sync-section">
            <h3>Sync Settings</h3>
            <p>
                You are currently on {window.location.hostname}.
                You can sync these settings to {settings.otherDomain}.
            </p>
            <button onclick={() => settings.syncToOther()}>
                Save & Sync to {settings.otherDomain}
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