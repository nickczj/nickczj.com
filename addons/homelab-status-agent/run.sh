#!/usr/bin/env sh
set -eu

exec /usr/local/bin/homelab-status-agent \
  --daemon \
  --config /data/options.json
