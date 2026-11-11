# Progress Tracker

Last updated: 2026-11-11

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
- [x] Audit reduced from 127 advisories to the documented build-time/upstream exceptions
- [x] Node, Bun, and Wrangler pinned; `.nvmrc` and `.bun-version` added
- [x] `bun run check` gate (tests, typecheck, audit)
- [x] GitHub Actions CI and Dependabot
- [x] Rust homelab add-on refreshed: Rust 1.99.1, pinned Docker images, Cargo lockfile, `cargo audit` clean

## Pages & Routes

- [x] `/` — homepage dashboard with live homelab strip, blog/now hooks, terminal overlay
- [x] `/blog` — blog index + `/blog/[slug]` post pages
- [x] `/now` — now index + `/now/[period]` entry pages
- [x] `/uses` — hardware/software setup page (filled November 2026; redesign planned)
- [x] `/colophon` — site stack documentation, GitHub source link, current font/content details
- [x] `/projects` — standalone route with index + 4 detail pages (homelab, fire-finance-math, esp32-heltec-wireless-paper, esp32-eink-spectra6)
- [ ] `/archive` — version showcase page for past iterations of nickczj.com

## Content

- [x] Blog collection schema and published post (`improving-cardio.md`)
- [x] Unpublished outlines moved to `content/_drafts/` and out of the indexed `blog` collection
- [x] Now collection with May 2026 and November 2026 entries
- [x] Pages collection: colophon and uses current
- [~] Next blog posts need writing (Vesto caching, GoReleaser casks)
- [x] `/projects` content — 4 published projects with screenshots and interactive topology cards
- [~] Homelab project page hardware/services section still describes the Pi 5 as the main host; needs a NAS + HA Yellow refresh

## Homelab Status Integration

- [x] Push-based architecture design (homelab → Cloudflare D1 → public API → homepage)
- [x] D1 database schema: `metrics` + `service_status` tables (migration 0002)
- [x] `GET /api/status` — public read endpoint with 30s cache
- [x] `POST /api/_status/ingest` — authenticated write endpoint
- [x] Pusher script — collects CPU, mem, temp, load, uptime, Docker service states
- [x] Standalone pusher script for NAS deployment (no repo dependencies)
- [x] Pusher script unit tests (parsers for /proc/stat, /proc/meminfo, sensors, docker inspect)
- [x] Shared server utils — validation, D1 read/write, memory fallback, response building
- [x] Homelab status tests (validation, memory store, D1 adapter via FakeD1)
- [x] Homepage KPI grid + service pills + sparkline history components
- [x] Staleness detection (marks data stale after 3 min, degrades gracefully)
- [x] D1 binding configured in `wrangler.toml` (`HOMELAB_DB`)
- [x] Auth token generated and stored in `.secrets`
- [x] D1 migrations applied to Cloudflare
- [x] Pusher deployed to NAS (systemd timer, every 2 min)
- [x] Service list: traefik, immich_server, jellyfin, suwayomi, paperless, beszel
- [x] D1 read query fixed to only return services from latest push
- [x] End-to-end verified: homelab → ingest → D1 → API → homepage
- [x] All three nodes reporting (`nas`, `pi5`, `ha-yellow`) with Tailscale state

## Singapore Finance Tools

- [ ] CPF allocation + bonus interest calculator
- [ ] SSB vs T-Bill comparator with live rates
- [ ] FIRE number calculator with SG cost-of-living defaults
- [~] SG yields homepage tile labeled as a static May 2026 snapshot; live wiring still pending

## Polish & Extras

- [x] Terminal overlay (`` ` `` or Cmd+K) with commands: help, ls, cd, whoami, cv, uptime, yields, clear
- [x] GitHub contribution heatmap (wired to GitHub GraphQL API with 5-minute edge cache)
- [x] Real GitHub contribution data for heatmap (integrated with GitHub GraphQL API, deployed)
- [ ] Terminal-style 404 page
- [ ] Konami-code easter egg
- [ ] `/bookmarks` or `/linkroll` page
- [ ] Optional sitemap (`public/robots.txt` exists but has no sitemap reference)

---

## Next Steps (in priority order)

1. **Publish blog posts** — turn the two `content/_drafts/` outlines into real posts.
2. **Refresh the homelab project page** — add the UGREEN NAS and HA Yellow to the hardware and services sections.
3. **Version archive** — build `/archive` showcasing past iterations of nickczj.com (v1, v2, v3).
4. **Singapore finance tools** — start with the CPF calculator (highest SEO value, validates Vesto logic publicly).
5. **Optional polish** — terminal-style 404, Konami easter egg, sitemap.
