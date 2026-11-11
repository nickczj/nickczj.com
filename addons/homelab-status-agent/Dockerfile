FROM rust:1.99.1-alpine@sha256:44819b27be4c97b0e4d7203bd2e02c4820f97700211b6a37fb4c246a2de59383 AS builder

RUN apk add --no-cache build-base cmake musl-dev perl

WORKDIR /app
COPY Cargo.toml Cargo.lock* ./
COPY src ./src
RUN cargo build --release --locked

FROM ghcr.io/home-assistant/aarch64-base:3.24-2026.11.0@sha256:48408ed8587f35994babee9ff7ef3e6c6fd3f87ea07fb1f4b11ff1c42401e92a

ARG BUILD_VERSION=0.1.6
ARG BUILD_ARCH=aarch64

LABEL \
  io.hass.version="${BUILD_VERSION}" \
  io.hass.type="app" \
  io.hass.arch="${BUILD_ARCH}"

RUN apk add --no-cache ca-certificates

COPY --from=builder /app/target/release/homelab-status-agent /usr/local/bin/homelab-status-agent
COPY run.sh /run.sh

RUN chmod +x /run.sh

CMD ["/run.sh"]
