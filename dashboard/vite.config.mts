import { defineConfig } from "vite";
import {svelte, vitePreprocess} from "@sveltejs/vite-plugin-svelte";
import deno from "@deno/vite-plugin";

export default defineConfig({
    plugins: [
        deno(),
        svelte({
            preprocess: vitePreprocess()
        })
    ],
    root: ".",
    build: {
        outDir: "dist",
        emptyOutDir: true
    }
});
