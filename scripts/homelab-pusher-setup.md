# Homelab Status Pusher — Linux Deployment Guide

How to deploy `scripts/push-homelab-status-standalone.ts` on a normal Linux device as a systemd timer. The script collects CPU, memory, temperature, load, and Docker service states, then POSTs them to `nickczj.com/api/_status/ingest`.

Currently deployed on the NAS. This guide covers the NAS and Raspberry Pi 5 path. Home Assistant Yellow on HAOS uses the Rust local add-on instead; see `docs/haos-homelab-status-agent.md`.

## Prerequisites

Install Bun (the script shebang is `#!/usr/bin/env bun`):

```bash
curl -fsSL https://bun.sh/install | bash
```

Install lm-sensors for temperature readings:

```bash
# Debian/Ubuntu/Raspberry Pi OS
sudo apt install lm-sensors
```

Run `sensors -j` once to verify it produces JSON output. If it fails, run `sudo sensors-detect` to configure the chip drivers.

The user running the service must have permission to run `docker` commands. Add the service user to the `docker` group:

```bash
sudo usermod -aG docker $USER
```

## Environment Variables

Copy the standalone script to the device (e.g., `/opt/homelab-pusher/push-homelab-status-standalone.ts`), then create an env file at `/opt/homelab-pusher/.env`:

```sh
# Required — from wrangler pages secret put HOMELAB_STATUS_TOKEN
HOMELAB_STATUS_ENDPOINT="https://nickczj.com/api/_status/ingest"
HOMELAB_STATUS_TOKEN="<the bearer token>"

# Node identity (must be unique per device)
HOMELAB_NODE_ID="pi5"          # or "nas"
HOMELAB_NODE_ROLE="docker"     # optional, free-form label

# Docker containers to monitor (comma-separated)
# Only list containers that actually run on this device.
# Leave empty or omit to monitor nothing except KPIs.
HOMELAB_DOCKER_SERVICES="traefik,jellyfin,pihole"
```

Node IDs in use for this TypeScript pusher: `nas`, `pi5`. HA Yellow uses the Rust add-on with `ha-yellow`.

## Testing

Dry-run to verify collection and validation without sending data:

```bash
cd /opt/homelab-pusher
source .env && HOMELAB_DRY_RUN=1 bun run push-homelab-status-standalone.ts
```

You should see a JSON payload printed. Check that KPIs have sensible values and services show `up`/`down`/`slow` as expected.

Then do a real push:

```bash
source .env && bun run push-homelab-status-standalone.ts
```

It should print `pushed homelab status to https://nickczj.com/api/_status/ingest`. Verify it shows up on the homepage at `https://nickczj.com`.

## systemd Service + Timer

Create a oneshot service at `/etc/systemd/system/homelab-pusher.service`:

```ini
[Unit]
Description=Homelab status pusher
After=network-online.target docker.service
Wants=network-online.target

[Service]
Type=oneshot
User=<your-user>
WorkingDirectory=/opt/homelab-pusher
EnvironmentFile=/opt/homelab-pusher/.env
ExecStart=/home/<your-user>/.bun/bin/bun run /opt/homelab-pusher/push-homelab-status-standalone.ts

# Restrict filesystem access
ProtectSystem=strict
ProtectHome=read-only
ReadWritePaths=/opt/homelab-pusher
PrivateTmp=yes
NoNewPrivileges=yes
```

Create a timer at `/etc/systemd/system/homelab-pusher.timer`:

```ini
[Unit]
Description=Push homelab status every 2 minutes
Requires=homelab-pusher.service

[Timer]
OnBootSec=30s
OnUnitActiveSec=2min
RandomizedDelaySec=15
Persistent=true

[Install]
WantedBy=timers.target
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now homelab-pusher.timer
```

Check status:

```bash
systemctl status homelab-pusher.timer
systemctl list-timers homelab-pusher
journalctl -u homelab-pusher.service -f   # tail logs
```

## Per-device notes

### Raspberry Pi 5

- OS: Raspberry Pi OS (Debian-based). Follow the Debian/Ubuntu steps above.
- `lm-sensors` may need `sudo sensors-detect` to activate the CPU thermal driver (`cpu_thermal`). On Pi 5, check that `sensors -j` returns readings under `cpu_thermal-virtual-0`.
- If you run Docker containers on the Pi, set `HOMELAB_DOCKER_SERVICES` to the relevant container names.
- The Pi 5's CPU governor may mask real utilization — the script reads from `/proc/stat` which gives actual hardware counters, so KPIs will be accurate.

### Home Assistant Yellow

Do not use this Bun/systemd script on HAOS. Home Assistant Yellow runs the Rust `homelab-status-agent` local add-on instead:

```text
addons/homelab-status-agent/
```

Setup guide: `docs/haos-homelab-status-agent.md`.
