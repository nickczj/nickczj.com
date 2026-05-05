# Progress Tracker

Last updated: 2026-05-05

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

## Pages & Routes

- [x] `/` — homepage dashboard with live homelab strip, blog/now hooks, terminal overlay
- [x] `/blog` — blog index + `/blog/[slug]` post pages
- [x] `/now` — now index + `/now/[period]` entry pages
- [x] `/uses` — hardware/software setup page
- [x] `/colophon` — site stack documentation
- [ ] `/projects` — standalone route (currently just a homepage anchor)

## Content

- [x] Blog collection schema and 3 draft outlines (Vesto caching, CPF math, GoReleaser casks)
- [x] Now collection with May 2026 entry
- [x] Pages collection (colophon written, uses mostly TODO)
- [~] Blog posts need writing (all 3 are `draft: true`, outlines only)
- [~] `/uses` page has TODOs for every section (hardware, OS, editor, dotfiles, services)
- [ ] `/projects` content (Vesto, homelab, older work with screenshots)

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

## Singapore Finance Tools

- [ ] CPF allocation + bonus interest calculator
- [ ] SSB vs T-Bill comparator with live rates
- [ ] FIRE number calculator with SG cost-of-living defaults

## Polish & Extras

- [x] Terminal overlay (`` ` `` or Cmd+K) with commands: help, ls, cd, whoami, cv, uptime, yields, clear
- [x] GitHub contribution heatmap (currently seeded pseudo-random, not real data)
- [ ] Terminal-style 404 page
- [ ] Konami-code easter egg
- [ ] Real GitHub contribution data for heatmap
- [ ] `/bookmarks` or `/linkroll` page

---

## Next Steps (in priority order)

1. **Write blog posts** — promote the 3 drafts from outlines to published posts.
2. **Fill in `/uses`** — replace all TODOs with real hardware, software, and setup details.
3. **Build `/projects`** — standalone route with Vesto, homelab, and older projects (screenshots, not just text).
4. **Singapore finance tools** — start with CPF calculator (highest SEO value, validates Vesto logic publicly).
