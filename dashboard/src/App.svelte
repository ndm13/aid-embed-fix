<script lang="ts">
    import LinkPage from "./LinkPage.svelte";
    import SettingsPage from "./SettingsPage.svelte";

    let currentPage = $state('link');

    function updatePageByHash() {
        const hash = ['#link', '#settings'].filter(e => document.location.hash === e).map(e => e.substring(1)).pop();
        if (hash) currentPage = hash;
    }
    updatePageByHash();
</script>

<svelte:window onhashchange={updatePageByHash} />

<header>
    <h2>AI Dungeon Embed Fix</h2>
    <nav>
        <a href="#link" class:active={currentPage === 'link'}>
            <i class="fa-solid fa-link"></i>
            <span>Fix Link</span>
        </a>
        <a href="#settings" class:active={currentPage === 'settings'}>
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
    {/if}
</main>

<footer>
    <p>&copy; {new Date().getFullYear()} ndm13 (@burnout)</p>
    <nav>
        <a target="_blank" href="https://discord.gg/GUPFSw85HH" title="Discord">
            <i class="fa-brands fa-discord"></i>
        </a>
        <a target="_blank" href="https://github.com/ndm13/aid-embed-fix" title="GitHub">
            <i class="fa-brands fa-github"></i>
        </a>
    </nav>
</footer>

<style>
    header {
        display: flex;
        flex-direction: row;
        justify-content: space-between;
        align-items: center;
        gap: 1rem;
        margin: 0 1rem;
    }

    @media (width < 50rem) {
        header {
            flex-direction: column;
            justify-content: center;
        }
    }

    h2 {
        margin: 0;
        padding: 0;
    }

    nav {
        display: flex;
        gap: 1rem;
    }

    header nav a {
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

    header nav a:hover {
        background-color: rgba(248, 174, 44, 0.7);
    }

    header nav a.active {
        background-color: rgba(248, 174, 44, 0.5);
        font-weight: bold;
    }

    main {
        margin: 0 auto;
        padding: 1rem;
    }

    footer {
        display: flex;
        flex-direction: row;
        justify-content: space-between;
        align-items: center;
        margin: 1rem;
    }

    footer nav a {
        color: unset;
    }

    @media (width < 30rem) {
        footer {
            flex-direction: column;
            justify-content: center;
        }
    }
</style>