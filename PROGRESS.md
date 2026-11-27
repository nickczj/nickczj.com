# Progress Tracker

Last updated: 2026-11-27

## Legend

- [x] Done
- [~] Partial / in progress
- [ ] Not started

---

## Foundation

- [x] Nuxt 4 + Vue 3 + Bun stack
- [x] Cloudflare Pages deployment (static prerender + serverless functions)
- [x] Nuxt Content v3 for file-based content (blog, now, pages)
- [x] CI/build pipeline (`bun run build`, `bun run generate`)
- [x] Test suite (`bun test`) with homelab coverage

## Tooling & Upkeep

- [x] Dependencies refreshed within ranges (Nuxt 4.6.4, Content 3.16.2, Vue 3.5.45)
- [x] Node 26.13.0, Bun 1.4.4, Wrangler 4.160.1, and `@types/node` 26 pinned
- [x] Major decisions recorded: Node 26 and better-sqlite3 13 upgraded; KaTeX 0.16.47 and TypeScript 5.9.3 kept
- [x] Audit reduced from 127 advisories to the documented build-time/upstream exceptions
- [x] `bun run check` gate (tests, typecheck, audit)
- [x] GitHub Actions CI and Dependabot
- [x] Cloudflare compatibility dates set to 2026-11-01; dump noindex and baseline security headers configured
- [x] Secrets rotated for homelab ingest, Spotify, and GitHub
- [x] Rust homelab add-on refreshed: Rust 1.99.1, pinned Docker images, Cargo lockfile, `cargo audit` clean

## Pages & Routes

- [~] `/` — blank placeholder while the new homepage is tried out in the dev-only `/lab` (the old dashboard moved to `/projects/homelab`)
- [x] `/blog` — blog index + `/blog/[slug]` post pages
- [x] `/now` — now index + `/now/[period]` entry pages; the index has a "Right now" block (reading, Spotify, Singapore weather)
- [x] `/uses` — hardware/software setup page (filled November 2026; redesign planned)
- [x] `/colophon` — site stack documentation, GitHub source link, current font/content details
- [x] `/projects` — standalone route with index + 4 detail pages (homelab, fire-finance-math, esp32-heltec-wireless-paper, esp32-eink-spectra6) and the GitHub contribution calendar
- [x] `/watches` — collection index, detail pages, and `/watches/admired`
- [ ] `/archive` — version showcase page for past iterations of nickczj.com

## Content

- [x] Blog collection schema and published post (`improving-cardio.md`)
- [x] Unpublished outlines moved to `content/_drafts/` and out of the indexed `blog` collection
- [x] Now collection with May 2026 and November 2026 entries
- [x] Pages collection: colophon and uses current
- [~] Next blog posts need writing (Vesto caching, GoReleaser casks)
- [x] `/projects` content — 4 published projects with screenshots and interactive topology cards
- [x] Watch collection — 2 owned and 7 admired entries, allowlist schema, EXIF-stripped photo pipeline, and `/watches/admired`
- [x] Homelab project page rewritten for the NAS, Pi 5 and HA Yellow, with the live status panel on top

## Homelab Status Integration

- [x] Push-based architecture design (homelab → Cloudflare D1 → public API → `/projects/homelab`)
- [x] D1 database schema: `metrics` + `service_status` tables (migration 0002)
- [x] `GET /api/status` — public read endpoint with 30s cache
- [x] `POST /api/_status/ingest` — authenticated write endpoint
- [x] Pusher script — collects CPU, mem, temp, load, uptime, Docker service states
- [x] Standalone pusher script for NAS deployment (no repo dependencies)
- [x] Pusher script unit tests (parsers for /proc/stat, /proc/meminfo, sensors, docker inspect)
- [x] Shared server utils — validation, D1 read/write, memory fallback, response building
- [x] Homelab status tests (validation, memory store, D1 adapter via FakeD1)
- [x] Status panel (KPI grid, node tiles, reported services, sparkline history), moved from the homepage to `/projects/homelab`; view logic in `shared/homelab/view.ts` with tests
- [x] Staleness detection (marks data stale after 3 min, degrades gracefully)
- [x] D1 binding configured in `wrangler.toml` (`HOMELAB_DB`)
- [x] Auth token generated and stored in `.secrets`
- [x] D1 migrations applied to Cloudflare
- [x] Pusher deployed to NAS (systemd timer, every 2 min)
- [x] Service list: NAS — traefik, immich_server, jellyfin, suwayomi, beszel; pi5 — bento-pdf, shlink (retired services removed 2026-11-24)
- [x] D1 read query fixed to only return services from latest push
- [x] End-to-end verified: homelab → ingest → D1 → API → page
- [x] All three nodes reporting (`nas`, `pi5`, `ha-yellow`) with Tailscale state

## Singapore Finance Tools

- [ ] CPF allocation + bonus interest calculator
- [ ] SSB vs T-Bill comparator with live rates
- [ ] FIRE number calculator with SG cost-of-living defaults
- [~] SG yields: static May 2026 snapshot on `/projects/fire-finance-math`; live wiring still pending

## Polish & Extras

- [x] Terminal overlay (`` ` `` or Cmd+K) on `/projects/homelab` with commands: help, ls, cd, whoami, cv, uptime, yields, clear
- [x] GitHub contribution heatmap (wired to GitHub GraphQL API with 5-minute edge cache)
- [x] Real GitHub contribution data for heatmap (integrated with GitHub GraphQL API, deployed)
- [ ] Terminal-style 404 page
- [ ] Konami-code easter egg
- [ ] `/bookmarks` or `/linkroll` page
- [ ] Optional sitemap (`public/robots.txt` exists but has no sitemap reference)

---

## Next Steps (in priority order)

1. **New homepage** — try ideas in `/lab` (dev only) and move the one that sticks into `app/pages/index.vue`.
2. **Publish blog posts** — turn the two `content/_drafts/` outlines into real posts.
3. **Version archive** — build `/archive` showcasing past iterations of nickczj.com (v1, v2, v3).
4. **Singapore finance tools** — start with the CPF calculator (highest SEO value, validates Vesto logic publicly).
5. **Optional polish** — terminal-style 404, Konami easter egg, sitemap.
