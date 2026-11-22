# nickczj.com

Personal site built with Nuxt 4, Vue 3, and Bun. Deployed to Cloudflare Pages with D1-backed live homelab status.

## Stack

- **Framework:** Nuxt 4 + Vue 3 + Bun
- **Content:** Nuxt Content v3 (file-based, markdown)
- **Hosting:** Cloudflare Pages (static prerender + serverless functions)
- **Database:** Cloudflare D1 (content and homelab telemetry)
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
- `content/watches/*.md` — the watch collection at `/watches` (see [Watches](#watches); everything in it is public)

Projects are managed outside Nuxt Content via `app/data/projects.ts` with detail pages under `app/pages/projects/` and interactive card visuals in `app/components/projects/cards/`.

The homepage queries blog, now, and currently collections, plus live API data from homelab status, GitHub contributions, and Spotify. Unpublished posts live in `content/_drafts/` and are not part of the indexed blog collection.

## Watches

`/watches` lists the watch collection; `/watches/<slug>` shows photos, specs, an optional accuracy chart, and the write-up.

- **Data:** one Markdown file per watch in `content/watches/<slug>.md`. Start from `content/_drafts/watches/_template.md`. The schema lives in `shared/watches/schema.ts`.
- **Public by construction:** this repo is public, and Nuxt Content serves every collection as a SQL dump (`/dump.watches.sql`, `/__nuxt_content/watches/sql_dump.txt`), including frontmatter keys the schema does not declare. Never add prices, serial or case numbers, receipts, insurance values, or where a watch is kept. `tests/watches-content.test.ts` (part of `bun run check`) rejects undeclared keys and obvious amounts or serials. Unpublished entries go in `content/_drafts/watches/`, which is outside the collection.
- **Photos:** originals stay in Immich. Export the shots for one watch and run:

  ```bash
  bun run watches:photos <slug> ~/Downloads/hero.jpg ~/Downloads/wrist.heic   # process only
  bun run watches:photos <slug> ~/Downloads/hero.jpg --upload                 # process and upload
  ```

  The photo id is the file name (`hero.jpg` → `hero`). The script applies EXIF orientation, converts to sRGB, strips all metadata (EXIF, GPS, XMP, IPTC, ICC) and checks the output, then writes AVIF and JPEG variants at 800/1600/2400 px to `.cache/watch-photos/`. It records dimensions and a placeholder colour in `app/data/watch-photos.json` (commit this file). With `--upload` it puts the variants in the R2 bucket `nickczj-media` with immutable caching; file names carry a content hash. HEIC is converted with macOS `sips` first.
- **Serving:** the pages load photos from `runtimeConfig.public.mediaBaseUrl` (`https://media.nickczj.com`, the bucket's custom domain). To preview locally processed photos, run `NUXT_PUBLIC_MEDIA_BASE_URL=/_media bun run dev`; dev serves `.cache/watch-photos` at `/_media`.
- **Accuracy:** add timegrapher or app readings under `accuracy` (`date`, `seconds_per_day`, optional `note`). Mechanical watches show the COSC −4/+6 s/day band for reference.

One-time setup for the bucket (account-level Cloudflare changes; the custom domain adds a DNS record):

```bash
bunx wrangler r2 bucket create nickczj-media
bunx wrangler r2 bucket domain add nickczj-media --domain media.nickczj.com --zone-id <nickczj.com zone id> --min-tls 1.2
```

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

That runs `bun run build:cf` and then pinned Wrangler `4.160.1`:

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

Required Pages secrets:

- `HOMELAB_STATUS_TOKEN` — NAS/Pi pushers and the HA Yellow add-on
- `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `SPOTIFY_REFRESH_TOKEN` — Spotify now-playing; refresh with `bun run scripts/spotify-auth.ts`
- `GITHUB_TOKEN` — classic PAT with `read:user` for the contribution graph

Set each one interactively:

```bash
bunx wrangler pages secret put <NAME> --project-name nickczj-com
```

After rotating a secret, deploy a fresh build and verify the relevant API (`/api/status`, `/api/spotify/now`, or `/api/github/contributions`). Never commit `.env` or `.secrets`.

### Wrangler Config

Two D1 bindings in `wrangler.toml`:

- `DB` → `nickczj-content` (Nuxt Content)
- `HOMELAB_DB` → `nickczj-homelab-status` (homelab telemetry)

## Homelab Pusher Deployment

The standalone script (`scripts/push-homelab-status-standalone.ts`) runs on the NAS/Pi via systemd timer. Home Assistant Yellow uses the Rust local add-on in `addons/homelab-status-agent/`.

- NAS/Pi setup: `scripts/homelab-pusher-setup.md`
- HAOS setup: `docs/haos-homelab-status-agent.md`
