<script lang="ts">
    import LinkPage from "./LinkPage.svelte";
    import SettingsPage from "./SettingsPage.svelte";
    import PrivacyPage from "./PrivacyPage.svelte";

    let currentPage = $state('link');
</script>

<header>
    <h2>AI Dungeon Embed Fix</h2>
    <nav>
        <a href="#" onclick={(e) => { e.preventDefault(); currentPage = 'link'; }} class:active={currentPage === 'link'}>
            <i class="fa-solid fa-link"></i>
            <span>Fix Link</span>
        </a>
        <a href="#" onclick={(e) => { e.preventDefault(); currentPage = 'settings'; }} class:active={currentPage === 'settings'}>
            <i class="fa-solid fa-gear"></i>
            <span>Settings</span>
        </a>
    </nav>
</header>

<main>
    {#if currentPage === 'link'}
        <LinkPage />
    {:else if currentPage === 'settings'}
        <SettingsPage />
    {:else}
        <PrivacyPage />
    {/if}
</main>

<footer>
    <p>&copy; {new Date().getFullYear()} ndm13 (@burnout)</p>
    <nav>
        <a target="_blank" href="https://discord.gg/GUPFSw85HH">Discord</a>
        <a target="_blank" href="https://github.com/ndm13/aid-embed-fix">GitHub</a>
    </nav>
</footer>

<style>
    header {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        justify-content: space-around;
        align-items: center;
        gap: 1rem;
        margin: 0 0 1rem;
    }

    h2 {
        margin: 0;
        padding: 0;
    }

    nav {
        display: flex;
        gap: 1rem;
    }

    nav a {
        text-decoration: none;
        color: inherit;
        padding: 0.5rem 1rem;
        border-radius: 4px;
        border: 1px solid #222;
        transition: background-color 0.2s;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.25rem;
        font-size: 0.8rem;
    }

    nav a i {
        font-size: 1.2rem;
    }

    nav a:hover {
        background-color: rgba(248, 174, 44, 0.7);
    }

    nav a.active {
        background-color: rgba(248, 174, 44, 0.5);
        font-weight: bold;
    }

    main {
        margin: 0 auto;
        border: 1ex double #222;
        padding: 1rem;
        border-left: none;
        border-right: none;
    }

    footer {
        display: flex;
        flex-wrap: wrap;
        flex-direction: row;
        justify-content: space-around;
        align-items: center;
        margin: 1rem;
    }
</style>