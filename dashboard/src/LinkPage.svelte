<script lang="ts">
    import LinkBuilder from "./LinkBuilder.svelte";

    let generatedLink: URL | undefined = $state();
    let previewHtml = $state("");

    $effect(() => {
        if (!generatedLink) {
            previewHtml = "";
            return;
        }
        const forceBody = new URL(generatedLink.pathname, document.location.protocol + document.location.host);
        if (generatedLink.searchParams.has("shareId"))
            forceBody.searchParams.set("shareId", generatedLink.searchParams.get("shareId"));
        if (generatedLink.searchParams.has("cover"))
            forceBody.searchParams.set("cover", generatedLink.searchParams.get("cover"));
        forceBody.searchParams.set("no_ua", "true");
        forceBody.searchParams.set("skipDashboardCheck", "true");

        fetch(forceBody)
            .then((res) => res.text())
            .then((html) => {
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, "text/html");
                const embed = doc.querySelector(".embed");

                if (embed) {
                    const section = document.createElement("section");
                    section.className = embed.className;
                    section.innerHTML = embed.innerHTML;
                    previewHtml = section.outerHTML;
                }
            });
    });

    function copyToClipboard() {
        if (!generatedLink) return;
        navigator.clipboard.writeText(generatedLink.href);
    }
</script>

<div class="sxs">
    <section class="builder">
        <h4>Paste your link below to customize it!</h4>
        <LinkBuilder bind:generatedLink />
    </section>

    {#if previewHtml}
        <section class="preview">
            <h4>Your embed will look like this 👇</h4>
            {@html previewHtml}
        </section>
    {/if}

    {#if generatedLink}
        <section class="output">
            <p>
                Awesome! Share this link (👇) to get it to look like that (👉).
            </p>
            <div class="row">
                <label for="generated-url-input">Share Link:</label>
                <input id="generated-url-input" type="text" value={generatedLink.href} readonly />
                <button type="button" onclick={copyToClipboard} aria-label="Copy to clipboard" title="Copy to clipboard">📋</button>
            </div>
        </section>
    {/if}
</div>

<style>
    .sxs {
        display: grid;
        grid-template-areas: "builder preview" "output preview";
        align-items: flex-start;
        gap: 1rem;
    }
    .builder {
        width: 60ex;
        grid-area: builder;
    }
    .preview {
        grid-area: preview;
    }
    .output {
        grid-area: output;
        align-self: self-end;
        margin: 1ex;
        padding-bottom: 1ex;
    }

    .row {
        display: flex;
        gap: 0.5rem;
        align-items: center;
    }
    .row input {
        flex-grow: 1;
    }
</style>