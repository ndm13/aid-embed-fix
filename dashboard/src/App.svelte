<script lang="ts">
    import LinkPage from "./LinkPage.svelte";
    import SettingsPage from "./SettingsPage.svelte";

    let currentPage = $state('link');
</script>

<header>
    <h2>AI Dungeon Embed Fix</h2>
    <button onclick={()=>currentPage = 'link'}>New Link</button>
    <button onclick={()=>currentPage = 'settings'}>Settings</button>
</header>

{#if currentPage === 'link'}
    <LinkPage />
{:else}
    <SettingsPage />
{/if}

<style>
    header {
        display: flex;
        flex-direction: row;
        place-content: center;
        gap: 1rem;
        margin: 1rem 0;
    }

    h2 {
        flex-grow: 1;
        margin: 0;
        padding: 0;
    }
</style>