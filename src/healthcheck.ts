const response = await fetch("http://localhost:8000/healthcheck", {
    headers: new Headers({ 'User-Agent': 'docker-healthcheck' })
});

if (!response.ok || (await response.text()) !== "ok")
    throw new Error("Healthcheck failed");