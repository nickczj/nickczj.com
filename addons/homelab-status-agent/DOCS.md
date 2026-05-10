# Homelab Status Agent

This add-on pushes Home Assistant Yellow node metrics to the `nickczj.com` homelab status API every two minutes.

## Configuration

- `endpoint`: status ingest endpoint. Default: `https://nickczj.com/api/_status/ingest`.
- `token`: bearer token matching the `HOMELAB_STATUS_TOKEN` Cloudflare Pages secret.
- `node_id`: stable node ID. Default: `ha-yellow`.
- `node_name`: display name. Default: `Home Assistant Yellow`.
- `node_role`: display role. Default: `smart home`.
- `collector_mode`: keep this as `haos` for Home Assistant Yellow.
- `interval_seconds`: push interval. Default: `120`.
- `dry_run`: print payload JSON instead of pushing.

## First Run

1. Set `token`.
2. Turn on `dry_run`.
3. Start the add-on and check logs.
4. Confirm the JSON has `node.id` set to `ha-yellow`, KPIs for CPU/memory/load/uptime, and `services: []`.
5. Turn off `dry_run`.
6. Restart the add-on and verify `https://nickczj.com/api/status` shows `ha-yellow` as live.

## Notes

This add-on is outbound-only. It does not need exposed ports, host networking, privileged mode, or Docker API access.
