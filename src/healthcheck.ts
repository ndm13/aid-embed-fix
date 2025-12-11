import config from "./config.ts";

const response = await fetch(`http://${config.network.listen.replace("0.0.0.0", "localhost")}/healthcheck`, {
    headers: new Headers({ "User-Agent": "docker-healthcheck" })
});

if (!response.ok || (await response.text()) !== "ok") {
    throw new Error("Healthcheck failed");
}
