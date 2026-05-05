don't expose the homelab at all — invert the flow and push status outward to a Cloudflare KV store, then have your public site read from that.
Why push beats pull here
You've explicitly drawn a privacy boundary with Tailscale. Punching a hole back through it (Cloudflare Tunnel for status, or Tailscale Funnel) re-creates an inbound attack surface for what's basically a vanity widget. It also couples uptime of nickczj.com to your home internet — your CV literally mentions "avoid SPOF in infra" as a learning, and home ISPs are a textbook SPOF.
The push model gives you: homelab fully private, public site reads from edge cache, last-known-good data is shown even if your homelab is down (with a stale indicator).
The architecture
Three pieces, all on Cloudflare's free tier since you're already deploying Pages there:

Pusher (in homelab) — a tiny script in a Docker container or systemd timer that runs every 60–120 seconds. Collects what you want to display: docker ps for service status, /proc/loadavg and /proc/meminfo for CPU/mem, lm-sensors for temps, uptime for uptime. If you've already got Prometheus, just query its HTTP API instead of re-collecting. Bundles it into one JSON blob and POSTs to a write endpoint with a shared secret in the header.
Write Worker (Pages Function in your Nuxt project, e.g. /api/_status/ingest) — verifies the secret, validates the shape, writes to KV under a single key like homelab:latest with a TTL of ~5 minutes. One write per push.
Read Worker (Pages Function, /api/status) — public, no auth, reads the KV key, returns JSON with { data, fetchedAt, stale: bool }. Set an edge cache of 30s so your read traffic doesn't hit KV every page load.

Your Nuxt page calls /api/status on mount (or SSR the initial render and revalidate client-side every 30s for the live feel).
Free tier math
Cloudflare KV free tier is 1k writes/day. At 60s push interval that's 1440/day — over budget. Push every 2 minutes instead (720/day) and you're comfortably under. Or use D1 instead of KV (100k writes/day) if you want more headroom. Reads are 100k/day, way more than you'll ever hit.
Batch all your metrics into the single KV key — don't write one key per service. Otherwise you blow the budget instantly.
Auth
Generate a long random secret, set it as a Pages env var on the Worker side and as a Docker env var on the homelab side. Header: Authorization: Bearer <secret>. That's it — you don't need OAuth or mTLS for read-only status data. If you're paranoid, also bind the write endpoint to a specific Cloudflare Access service token, but for this use case the bearer token is fine.
Stale handling
In the read endpoint, compare Date.now() to the stored fetchedAt. If older than ~3 minutes, set stale: true. Render the dashboard with amber dots and a "last updated 7m ago" label — much more honest than showing fake-live numbers when your homelab is actually down.
Why not Cloudflare Tunnel
You already use it for other homelab services, so the temptation is real. But it makes nickczj.com depend on home internet uptime, exposes a real endpoint behind your CF account that someone could probe, and you'd still want caching on top of it anyway. Push is strictly simpler once you've written the 30-line pusher script.
Why not Tailscale Funnel
Same uptime coupling, plus it's slightly opinionated infrastructure for what should be a tiny static-ish data feed. Save Funnel for things that genuinely need to be reachable.
What you'd write first
Start with the pusher script — a Bun script with Bun.serve isn't even needed, just a setInterval loop or a cron + one-shot script. Get it logging the JSON it would push. Then stand up the two Pages Functions. Then wire the dashboard. The whole thing is a weekend project, and you reuse the pattern later for any other "private data on public site" need (reading list, finance summary, whatever).
Want me to sketch the pusher script and the two Pages Functions concretely, or talk through the Prometheus-vs-direct-collection trade-off first?


1. Authenticate and confirm Pages project

bunx wrangler login
bunx wrangler pages project list

Set your project name once:

PROJECT=nickczj-com

2. Pull Pages config locally

bunx wrangler pages download config "$PROJECT" --force

Review the generated wrangler.toml or wrangler.jsonc. For this repo, make sure it includes:

pages_build_output_dir = "dist"
compatibility_date = "2025-07-15"
compatibility_flags = ["nodejs_compat"]

3. Create D1 databases
You need two D1 bindings on Cloudflare Pages:

bunx wrangler d1 create nickczj-content --binding DB --update-config
bunx wrangler d1 create nickczj-homelab-status --binding HOMELAB_DB --update-config

DB is for Nuxt Content on Cloudflare Pages. HOMELAB_DB is for the live homelab status code I added.

4. Apply only the homelab migration

bunx wrangler d1 migrations apply HOMELAB_DB --remote

Do not apply this migration to DB; that database is for Nuxt Content.

5. Add the ingest secret
Generate a token:

openssl rand -base64 48

Then set it on Pages:

bunx wrangler pages secret put HOMELAB_STATUS_TOKEN --project-name "$PROJECT"

Paste the generated token when prompted.

6. Deploy with the Cloudflare Pages preset
For dashboard/Git deployment, set:

Build command: NITRO_PRESET=cloudflare_pages bun run build
Build output directory: dist

For direct upload testing:
On the homelab host:

export HOMELAB_STATUS_ENDPOINT="https://nickczj.com/api/_status/ingest"
export HOMELAB_STATUS_TOKEN="<same token>"
export HOMELAB_NODE_NAME="homelab-v3"
export HOMELAB_DOCKER_SERVICES="traefik,grafana,home-assistant,jellyfin,vesto-dev,cf-tunnel"

Dry-run first:

HOMELAB_DRY_RUN=1 bun run homelab:push

Then push once:

bun run homelab:push

After that:

curl https://nickczj.com/api/status

You should see source: "d1", unavailable: false, and the latest payload.

Docs I checked: Cloudflare D1 Wrangler commands, D1 migrations, Pages D1 bindings, Pages Wrangler config, Pages secrets, and Nuxt Content
Cloudflare Pages deployment:
https://developers.cloudflare.com/d1/wrangler-commands/
https://developers.cloudflare.com/d1/reference/migrations/
https://developers.cloudflare.com/pages/functions/bindings/
https://developers.cloudflare.com/pages/functions/wrangler-configuration/
https://developers.cloudflare.com/workers/wrangler/commands/pages/
https://content.nuxt.com/docs/deploy/cloudflare-pages