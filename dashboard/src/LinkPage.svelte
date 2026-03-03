<script lang="ts">
    import LinkBuilder from "./LinkBuilder.svelte";

    let generatedLink: URL | undefined = $state();
    let previewCache = $state("");
    newCacheId();
    let previewHtml = $state("");
    let visibility: "published" | "unlisted" | undefined = $state();
    let copied = $state(false);

    $effect(() => {
        if (!generatedLink) {
            previewHtml = "";
            return;
        }
        const previewLink = new URL(generatedLink.pathname, document.location.protocol + document.location.host);
        if (generatedLink.searchParams.has("shareId"))
            previewLink.searchParams.set("shareId", generatedLink.searchParams.get("shareId"));
        if (generatedLink.searchParams.has("cover"))
            previewLink.searchParams.set("cover", generatedLink.searchParams.get("cover"));
        if (generatedLink.searchParams.has("published"))
            previewLink.searchParams.set("published", generatedLink.searchParams.get("published"));
        if (generatedLink.searchParams.has("unlisted"))
            previewLink.searchParams.set("unlisted", generatedLink.searchParams.get("unlisted"));
        previewLink.searchParams.set("preview", previewCache);

        fetch(previewLink)
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

                if (!visibility) {
                    console.log("Updating visibility from data");
                    visibility = (['published', 'unlisted'] as Array<"published" | "unlisted">)
                        .filter(e => (doc.querySelector('meta[name="aid:visibility"]') as HTMLMetaElement)?.content === e)
                        .pop();
                    console.log("Visibility is " + visibility);
                }
            });
    });

    function newCacheId() {
        // Generate a random hex string
        previewCache = Math.random().toString(16).slice(2);
    }

    function copyToClipboard() {
        if (!generatedLink) return;
        navigator.clipboard.writeText(generatedLink.href);
        copied = true;
        setTimeout(() => copied = false, 2000);
    }
</script>

<svelte:head>
    <title>Link Builder | AI Dungeon Embed Fix</title>
</svelte:head>

<div class="sxs">
    <section class="builder">
        <h4>Paste your link below to customize it!</h4>
        <LinkBuilder bind:generatedLink bind:visibility />
    </section>

    {#if previewHtml}
        <section class="preview">
            <header>
                <h4>Your embed will look like this 👇</h4>
                <button type="button" class="emoji" onclick={newCacheId} aria-label="Refresh Data" title="Refresh Data">🔄️</button>
            </header>
            {@html previewHtml}
        </section>
    {/if}

    {#if generatedLink}
        <section class="output">
            <p>
                Awesome! Share this <span class="linkpoint">link</span> to get it to look like <span class="embedpoint">that</span>.
            </p>
            <div class="row">
                <label for="generated-url-input">Share Link:</label>
                <input id="generated-url-input" type="text" value={generatedLink.href} readonly />
                <button type="button" class="emoji" onclick={copyToClipboard} aria-label="Copy to clipboard" title="Copy to clipboard">{copied ? '✅' : '📋'}</button>
            </div>
        </section>
    {/if}
</div>

<style>
    .linkpoint::after {
        content: ' (👇)';
    }
    .embedpoint::after {
        content: ' (👉)';
    }

    .sxs {
        display: grid;
        grid-template-areas: "builder preview" "output preview";
        grid-template-columns: minmax(min-content, 1fr) max-content;
        place-items: center;
        gap: 1rem;
        width: 100%
    }
    @media (width < 960px) {
        .sxs {
            grid-template-areas: "builder" "preview" "output";
            justify-items: center;
        }
        .embedpoint::after {
            content: ' (👆)';
        }
    }

    .builder, .output {
        width: 100%;
        max-width: 80ex;
    }

    .builder {
        grid-area: builder;
        align-self: start;
    }
    .output {
        grid-area: output;
        align-self: self-end;
        margin: 0 1ex 1ex;
        padding-bottom: 1ex;
    }
    .preview {
        grid-area: preview;
    }
    .preview header {
        display: flex;
        place-content: space-between;
        width: 100%;
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