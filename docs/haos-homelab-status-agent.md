# Home Assistant Yellow Homelab Status Agent

This guide installs the Rust `homelab-status-agent` as a Home Assistant local add-on/app on Home Assistant Yellow running HAOS.

Use this for HA Yellow only. NAS and Raspberry Pi 5 should keep using `scripts/push-homelab-status-standalone.ts` with a systemd timer.

## What It Reports

- CPU percentage from `/proc/stat`
- Memory percentage from `/proc/meminfo`
- 1-minute load average from `/proc/loadavg`
- Uptime seconds from `/proc/uptime`
- Temperature from `/sys/class/thermal` or `/sys/class/hwmon` when exposed
- No Docker, Home Assistant Core, Zigbee, add-on, or Supervisor service status in v0.1

The payload uses node ID `ha-yellow` and an empty `services` array.

## Files

The add-on lives in:

```text
addons/homelab-status-agent/
├── Cargo.toml
├── Dockerfile
├── config.yaml
├── run.sh
├── DOCS.md
└── src/
```

Home Assistant local add-ons are built from the add-on folder itself, so keep the Rust crate inside `addons/homelab-status-agent/`.

## Install On HAOS

1. Install and start either the Samba or SSH add-on in Home Assistant.
2. Copy this repo's `addons/homelab-status-agent` folder to the HAOS local add-ons directory:

```text
/addons/homelab-status-agent
```

3. In Home Assistant, open the add-on/app store.
4. Use the top-right menu and select check for updates.
5. Find `Homelab Status Agent` under local add-ons/apps.
6. Install it.

If it does not appear, check the Supervisor logs for YAML or Dockerfile errors.

The first install builds the Rust image on the Yellow. On a CM5/HAOS setup this can take several minutes and the UI may sit on `Installing` without granular progress. Check progress with:

```bash
ssh -p 2222 root@homeassistant.local
ha jobs info
ha supervisor logs --lines 120 | grep -iE "homelab|build|error|failed"
```

The install is complete when Supervisor logs `App 'local_homelab_status_agent' successfully installed`.

## Configure

Use the add-on configuration UI:

```yaml
endpoint: "https://nickczj.com/api/_status/ingest"
token: "<same value as Cloudflare Pages HOMELAB_STATUS_TOKEN>"
node_id: "ha-yellow"
node_name: "Home Assistant Yellow"
node_role: "smart home"
collector_mode: "haos"
interval_seconds: 120
dry_run: true
```

Start with `dry_run: true`. The token is required by the schema, but dry-run will not send it.

## Dry Run

Start the add-on and open logs. The payload should look like:

```json
{
  "version": 1,
  "node": {
    "id": "ha-yellow",
    "name": "Home Assistant Yellow",
    "role": "smart home",
    "uptimeSeconds": 123456
  },
  "kpis": [
    { "key": "cpu", "label": "cpu", "unit": "%", "value": 12.34, "window": "1m", "tone": "ok" },
    { "key": "mem", "label": "mem", "unit": "%", "value": 45.67, "window": "1m", "tone": "ok" },
    { "key": "temp", "label": "temp", "unit": "C", "value": 48.12, "window": "1m", "tone": "ok" },
    { "key": "load", "label": "load", "unit": "", "value": 0.42, "window": "1m", "tone": "ok" }
  ],
  "services": []
}
```

Temperature may be `null` if HAOS does not expose a usable sensor inside the add-on container.

## Enable Pushes

1. Set `dry_run: false`.
2. Save the add-on config.
3. Restart the add-on.
4. Check logs for `pushed homelab status`.
5. Verify the public read endpoint:

```bash
curl https://nickczj.com/api/status
```

The response should include a live `ha-yellow` node within about two minutes.

## Security Notes

- The add-on is outbound-only.
- It does not expose ports.
- It does not need host networking.
- It does not need privileged mode.
- It does not need Docker API access.
- Do not paste the bearer token into logs or shell history.

## Updating

After changing files under `addons/homelab-status-agent/`:

1. Copy the updated folder to `/addons/homelab-status-agent`.
2. Increment `version` in `config.yaml` if Home Assistant should show an update.
3. Check for updates in the local add-on/app store.
4. Rebuild or reinstall the add-on.
5. Restart and check logs.
