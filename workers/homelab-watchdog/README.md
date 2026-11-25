# homelab-watchdog

A scheduled Cloudflare Worker that sends a Telegram alert when the home
internet goes down, and another when it comes back.

NAS, pi5 and HA Yellow each push a heartbeat to the `nickczj-homelab-status`
D1 `metrics` table every two minutes. Every two minutes this Worker reads each
node's latest heartbeat:

- **All nodes stale for over 360 s** (`STALE_AFTER_SECONDS`): it opens a row
  in `wan_incidents` and sends "Home internet down". The start time is the
  last heartbeat heard.
- **Any node pushes again:** it closes the row with the first heartbeat after
  the start and sends "Home internet back" with the window and duration.

`wan_incidents` is not pruned, so it is the long-term outage log. It is
created and backfilled by `migrations/0004_wan_incidents.sql`.

The Worker runs outside the home, so the alert gets out while the home link
is down. Inside the home, Home Assistant's "WAN outage log" automation records
which side failed (router, Eight's gateway, or upstream).

## Deploy

```bash
# from the repo root: schema (once)
bunx wrangler d1 migrations apply HOMELAB_DB --remote

# from this folder
cd workers/homelab-watchdog
bunx wrangler secret put TELEGRAM_BOT_TOKEN   # the homelab alerts bot
bunx wrangler secret put TELEGRAM_CHAT_ID
bunx wrangler deploy
```

Without the two secrets it still records incidents and logs a warning instead
of sending.

## Check

```bash
bun test tests/homelab-watchdog.test.ts     # from the repo root
bunx wrangler tail homelab-watchdog         # watch the 2-minute runs
bunx wrangler d1 execute nickczj-homelab-status --remote \
  --command "SELECT id, datetime(start_ts,'unixepoch','+8 hours') AS start_sgt, duration_s, source, note FROM wan_incidents ORDER BY start_ts DESC"
```

For a dry run that writes nothing and sends nothing, set the plain-text
variable `WATCHDOG_DRY_RUN=1` on the Worker.

## Rollback

`bunx wrangler delete homelab-watchdog`. The `wan_incidents` table is harmless
and can stay.
