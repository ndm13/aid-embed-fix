FROM denoland/deno:2.4.5 AS builder
WORKDIR /app

COPY src/healthcheck.ts ./src/healthcheck.ts

RUN deno compile --allow-net=localhost:8000 --target x86_64-unknown-linux-gnu --output /healthcheck ./src/healthcheck.ts

COPY src/ ./src/
COPY deno.json .
COPY deno.lock .

RUN deno compile --allow-env --allow-read --allow-net --target x86_64-unknown-linux-gnu --output /server ./src/server.ts

FROM debian:11-slim
WORKDIR /app

COPY --from=builder /healthcheck .
HEALTHCHECK --start-interval=1s --start-period=5s --interval=30s --timeout=2s --retries=3 CMD ["/app/healthcheck"]

COPY templates/ ./templates/
COPY static/ ./static/

COPY --from=builder /server .

EXPOSE 8000
CMD ["/app/server"]
