#!/usr/bin/env sh
set -eu

exec /command/with-contenv /usr/local/bin/homelab-status-agent \
  --daemon \
  --config /data/options.json
