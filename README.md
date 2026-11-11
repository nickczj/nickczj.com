# nickczj.com

Personal site built with Nuxt 4, Vue 3, and Bun. Deployed to Cloudflare Pages with D1-backed live homelab status.

## Stack

- **Framework:** Nuxt 4 + Vue 3 + Bun
- **Content:** Nuxt Content v3 (file-based, markdown)
- **Hosting:** Cloudflare Pages (static prerender + serverless functions)
- **Database:** Cloudflare D1 (homelab telemetry)
- **Styling:** Plain CSS (no Tailwind)

## Local Development

Requires Node `26.13.0` and Bun `1.4.4` (see `.nvmrc` and `.bun-version`).

```bash
bun install
bun run dev        # http://localhost:3000
bun run build      # production build (Node preset)
bun run build:cf   # Cloudflare Pages build
bun run preview    # preview production build locally
bun test           # run test suite
bun run typecheck  # vue-tsc typecheck
bun run check      # tests + typecheck + audit gate
```

For Cloudflare runtime parity (Content uses D1 at runtime):

```bash
bun run build:cf
bunx wrangler pages dev dist \
  --d1 DB=nickczj-content \
  --d1 HOMELAB_DB=nickczj-homelab-status
```

## Content

Content lives in `content/` as markdown files managed by Nuxt Content v3:

- `content/blog/*.md` — blog posts (title, description, date, tags, draft)
- `content/_drafts/*.md` — unpublished outlines; outside every collection source, so never indexed or dumped
- `content/now/*.md` — monthly focus entries (title, description, date, summary)
- `content/currently/*.md` — currently-reading entries (book, author, chapter, link)
- `content/pages/*.md` — standalone pages (uses, colophon)

Projects are managed outside Nuxt Content via `app/data/projects.ts` with detail pages under `app/pages/projects/` and interactive card visuals in `app/components/projects/cards/`.

The homepage queries blog, now, and currently collections, plus live API data from homelab status, GitHub contributions, and Spotify. Unpublished posts live in `content/_drafts/` and are not part of the indexed blog collection.

## Homelab Status

Live system metrics from homelab nodes displayed on the homepage via a push-based architecture:

```text
NAS / Pi 5 (Bun standalone pusher via systemd timer, every 2 min)
HA Yellow (Rust HAOS local add-on, every 2 min)
  → POST /api/_status/ingest (Bearer token)
    → D1 (node-keyed metrics + service_status tables)
      → GET /api/status (public, 30s cache, fleet response)
        → Homepage (polls every 30s)
```

- **Pushers:** `scripts/push-homelab-status-standalone.ts` for NAS/Pi; `addons/homelab-status-agent/` for Home Assistant Yellow on HAOS
- **Tailscale:** reported as a node-scoped service for NAS, Pi 5, and HA Yellow
- **Ingest endpoint:** `server/api/_status/ingest.post.ts` — validates payload, writes to D1
- **Read endpoint:** `server/api/status.get.ts` — public, returns latest snapshot + history
- **Core logic:** `server/utils/homelab-status.ts` — types, validation, D1 read/write, memory fallback
- **Node identity:** `nas` and `pi5` use env vars; HA Yellow uses add-on options with `node_id: ha-yellow`
- **D1 schema:** `migrations/0002_structured_homelab_status.sql` + `migrations/0003_fleet_homelab_status.sql` — node-keyed `metrics` and `service_status` tables

### Local status fixtures

`bun run dev` shows a mock fleet response automatically when no D1 binding or in-memory pusher data exists. Override the local state with:

```
HOMELAB_STATUS_FIXTURE=fleet bun run dev
HOMELAB_STATUS_FIXTURE=partial bun run dev
HOMELAB_STATUS_FIXTURE=stale bun run dev
HOMELAB_STATUS_FIXTURE=down bun run dev
HOMELAB_STATUS_FIXTURE=none bun run dev
```

The pusher still works locally through the memory fallback; once a local push is received, it takes precedence over the automatic dev fixture.

## Deployment

### Cloudflare Pages

This project uses Cloudflare Pages **Direct Upload** (no Git integration). Deploy production from a clean `main`:

```bash
bun run deploy
```

That runs `bun run build:cf` and then the pinned local Wrangler:

```bash
wrangler pages deploy --project-name nickczj-com
```

Build output: `dist/`.

If deploying manually, keep the steps separate:

```bash
bun run build:cf
bunx wrangler pages deploy dist --project-name nickczj-com
```

Do not use `bunx wrangler pages deploy` as a Cloudflare dashboard build command — there is no dashboard build for this project.

### D1 Migrations

```bash
# Apply homelab schema to remote D1
bunx wrangler d1 migrations apply HOMELAB_DB --remote
```

### Secrets

```bash
# Set the ingest auth token on Cloudflare Pages
bunx wrangler pages secret put HOMELAB_STATUS_TOKEN --project-name nickczj-com
```

### Wrangler Config

Two D1 bindings in `wrangler.toml`:

- `DB` → `nickczj-content` (Nuxt Content)
- `HOMELAB_DB` → `nickczj-homelab-status` (homelab telemetry)

## Homelab Pusher Deployment

The standalone script (`scripts/push-homelab-status-standalone.ts`) runs on the NAS/Pi via systemd timer. Home Assistant Yellow uses the Rust local add-on in `addons/homelab-status-agent/`.

- NAS/Pi setup: `scripts/homelab-pusher-setup.md`
- HAOS setup: `docs/haos-homelab-status-agent.md`
