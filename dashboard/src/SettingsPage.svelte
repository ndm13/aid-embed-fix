<script lang="ts">

</script>

<main>
    <form>
        <h3>Link Builder Settings</h3>

        <h4>Defaults</h4>
        <div class="grid-section">
            <label for="link-env">
                Use this environment for links:
            </label>
            <select id="link-env">
                <option>Link Default (do not override)</option>
                <option>Production (play.)</option>
                <option>Beta (beta.)</option>
                <option>Alpha (alpha.)</option>
            </select>
            <label for="link-domain">
                Use this embed fix domain for links:
            </label>
            <select id="link-domain">
                <option>aidungeon.link</option>
                <option>axdungeon.com</option>
            </select>
            <label>
                <input type="checkbox"/>
                If editing an existing link, prefer the embed fix domain in use
            </label>
        </div>
    </form>

    <form>
        <h3>Proxy Settings</h3>

        <h4>Navigation</h4>
        <div class="grid-section">
            <label for="proxy-env">
                Use this environment for navigation:
            </label>
            <select id="proxy-env">
                <option>Link Default (do not override)</option>
                <option>Production (play.)</option>
                <option>Beta (beta.)</option>
                <option>Alpha (alpha.)</option>
            </select>
        </div>
    </form>
</main>


<style>
    main {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        gap: 2ex;
    }
    form {
        width: min-content;
        flex-grow: 1;
    }
    .grid-section {
        grid-template-columns: 1fr max-content;
    }
    label {
        min-width: 10em;
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