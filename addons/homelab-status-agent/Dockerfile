FROM rust:1-alpine AS builder

RUN apk add --no-cache build-base cmake musl-dev perl

WORKDIR /app
COPY Cargo.toml Cargo.lock* ./
COPY src ./src
RUN cargo build --release

FROM ghcr.io/home-assistant/aarch64-base:latest

ARG BUILD_VERSION=0.1.0
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
