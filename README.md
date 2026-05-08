# nickczj.com

Personal site built with Nuxt 4, Vue 3, and Bun. Deployed to Cloudflare Pages with D1-backed live homelab status.

## Stack

- **Framework:** Nuxt 4 + Vue 3 + Bun
- **Content:** Nuxt Content v3 (file-based, markdown)
- **Hosting:** Cloudflare Pages (static prerender + serverless functions)
- **Database:** Cloudflare D1 (homelab telemetry)
- **Styling:** Plain CSS (no Tailwind)

## Local Development

```bash
bun install
bun run dev        # http://localhost:3000
bun run build      # production build
bun run preview    # preview production build locally
bun test           # run test suite
```

## Content

Content lives in `content/` as markdown files managed by Nuxt Content v3:

- `content/blog/*.md` — blog posts (title, description, date, tags, draft)
- `content/now/*.md` — monthly focus entries (title, description, date, summary)
- `content/currently/*.md` — currently-reading entries (book, author, chapter, link)
- `content/pages/*.md` — standalone pages (uses, colophon)

Projects are managed outside Nuxt Content via `app/data/projects.ts` with detail pages under `app/pages/projects/` and interactive card visuals in `app/components/projects/cards/`.

The homepage queries blog, now, and currently collections, plus live API data from homelab status, GitHub contributions, and Spotify. Draft posts are filtered from public listings.

## Homelab Status

Live system metrics from homelab nodes displayed on the homepage via a push-based architecture:

```
NAS / Pi 5 / HA Yellow (systemd timer, every 2 min)
  → POST /api/_status/ingest (Bearer token)
    → D1 (node-keyed metrics + service_status tables)
      → GET /api/status (public, 30s cache, fleet response)
        → Homepage (polls every 30s)
```

- **Pusher:** `scripts/push-homelab-status.ts` (repo) or `scripts/push-homelab-status-standalone.ts` (self-contained, for deployment)
- **Ingest endpoint:** `server/api/_status/ingest.post.ts` — validates payload, writes to D1
- **Read endpoint:** `server/api/status.get.ts` — public, returns latest snapshot + history
- **Core logic:** `server/utils/homelab-status.ts` — types, validation, D1 read/write, memory fallback
- **Node identity:** set `HOMELAB_NODE_ID` (`nas`, `pi5`, `ha-yellow`) and optional `HOMELAB_NODE_ROLE` on each pusher
- **D1 schema:** `migrations/0002_structured_homelab_status.sql` + `migrations/0003_fleet_homelab_status.sql` — node-keyed `metrics` and `service_status` tables

## Deployment

### Cloudflare Pages

```bash
# Build with the Cloudflare Pages preset
NITRO_PRESET=cloudflare_pages bun run build
# Output: dist/
```

Deploy via the Cloudflare dashboard or Wrangler CLI. The dashboard build command should be:

```
bunx wrangler pages deploy
```

Build output directory: `dist`

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

The standalone script (`scripts/push-homelab-status-standalone.ts`) runs on the NAS via systemd timer. See `PROGRESS.md` for setup details.
