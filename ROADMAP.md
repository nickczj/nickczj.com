# Roadmap

## Legend

- [x] Shipped
- [~] In progress / partial
- [ ] Planned

---

## Milestone: Foundation (shipped)

- [x] Nuxt 4 + Vue 3 + Bun stack on Cloudflare Pages
- [x] Nuxt Content v3 file-based collections (blog, now, pages, currently)
- [x] Custom homepage dashboard with live integration strip
- [x] Shared site shell with nav and page layout
- [x] Blog index + detail pages (1 published post, 2 draft outlines)
- [x] `/now` collection with monthly focus entries
- [x] `/uses` page (markdown-backed, sections still WIP)
- [x] `/colophon` page with stack documentation
- [x] Dark mode with auto-detection and manual toggle
- [x] Content collections fully typed in `content.config.ts`

## Milestone: Projects (shipped)

- [x] `/projects` standalone route with index and featured layout
- [x] 4 published projects: homelab, FIRE finance math, ESPHome Heltec, DIY E-Ink
- [x] Interactive project card visuals (Vue Flow topology for homelab, SVG diagrams for e-ink projects, LaTeX for finance)
- [x] LaTeX rendering support for technical/math content
- [x] Project detail pages with SEO metadata
- [x] Status badges (active / archived / experimental)
- [x] Back-links to projects index from detail pages

## Milestone: Live Integrations (shipped)

- [x] Homelab status: push-based architecture (NAS → D1 → API → homepage)
- [x] Homelab D1 schema: metrics + service_status tables, 7-day retention
- [x] Homelab pusher script deployed on NAS via systemd timer (2-min interval)
- [x] Homelab end-to-end verified: ingest → D1 read → API cache → homepage polling
- [x] Public `/api/status` endpoint with 30s edge cache and stale detection
- [x] Public `/api/_status/ingest` authenticated ingest endpoint
- [x] GitHub contribution heatmap via GitHub GraphQL API with 5-minute cache
- [x] Spotify currently-playing via OAuth refresh token flow
- [x] Weather via Open-Meteo API (Singapore, updated every 5 min)
- [x] Build-time environment display (Node, Bun, OS, commit hash)
- [x] Currently-reading widget (`content/currently` collection)
- [x] Terminal overlay (`` ` `` or Cmd+K) with 8 commands

## Milestone: Content & Polish (in progress)

- [~] Publish remaining draft blog posts (vesto-four-layer-caching, goreleaser-homebrew-casks)
- [~] Fill in `/uses` page content (all sections still TODO markers)
- [~] Singapore SG yields section: static preview, needs Vesto live rate wiring

## Milestone: Version Archive (planned)

- [ ] Design archive page at `/archive` on nickczj.com
- [ ] Document version history:
  - v1 (deprecated): earliest iteration, no longer accessible online
  - v2 (Netlify): stoic-bell-9f7143.netlify.app, still live
  - v3 (current): Cloudflare Pages, this repo
- [ ] Decide v2 domain/subdomain strategy (see `docs/archive-plan.md`)
- [ ] Recover or document v1 (screenshots, Wayback Machine archive, code if available)
- [ ] Add screenshots and changelogs for each version
- [ ] Add `/archive` to site navigation

## Milestone: Singapore Finance Tools (future)

- [ ] CPF allocation + bonus interest calculator with age tiers and OA cap
- [ ] SSB vs T-Bill comparator with live rate data
- [ ] FIRE number calculator with SG cost-of-living defaults
- [ ] Wire SG yields section on homepage to live Vesto/API data

## Milestone: Charm & Extras (future)

- [ ] Terminal-style 404 page (currently default Nuxt 404)
- [ ] Konami-code easter egg
- [ ] `/bookmarks` or `/linkroll` page
- [ ] Add Vesto project detail page to `/projects`
- [ ] Wire GitHub repo metadata to colophon
