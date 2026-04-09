FROM denoland/deno:2.7.11 AS builder
WORKDIR /app

COPY src/config.ts ./src/config.ts
COPY src/healthcheck.ts ./src/healthcheck.ts
COPY deno.json .
COPY deno.lock .

RUN deno task compile:healthcheck --target x86_64-unknown-linux-gnu --output /healthcheck src/healthcheck.ts

COPY src/ ./src/
COPY dashboard/ ./dashboard/
COPY templates/ ./templates/
COPY static/ ./static/

RUN deno task dashboard:build

RUN deno task compile:server --target x86_64-unknown-linux-gnu --output /server src/server.ts

FROM debian:11-slim
WORKDIR /app

COPY --from=builder /healthcheck .
HEALTHCHECK --start-interval=1s --start-period=5s --interval=30s --timeout=2s --retries=3 CMD ["/app/healthcheck"]

COPY --from=builder /server .

EXPOSE 8000
CMD ["/app/server"]
