import "../../static/style.css";
import "../app.css";
import { mount } from "svelte";
import App from "./App.svelte";

let app;

if (!import.meta.env.SSR) {
    app = mount(App, {
        target: document.getElementById("app")!
    });
}

console.log("Main loaded");

export default app;
