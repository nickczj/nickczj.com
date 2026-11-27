# Roadmap

## Legend

- [x] Shipped
- [~] In progress / partial
- [ ] Planned

---

## Milestone: Foundation (shipped)

- [x] Nuxt 4 + Vue 3 + Bun stack on Cloudflare Pages
- [x] Nuxt Content v3 file-based collections (blog, now, pages, currently)
- [x] Custom homepage dashboard with live integration strip (moved to `/projects/homelab` in November 2026)
- [x] Shared site shell with nav and page layout (`app/layouts/default.vue`)
- [x] Blog index + detail pages (1 published post, 2 outlines in `content/_drafts/`)
- [x] `/now` collection with monthly focus entries
- [x] `/uses` page (markdown-backed, filled November 2026; redesign planned)
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

- [x] Homelab status: push-based architecture (NAS → D1 → API → `/projects/homelab`)
- [x] Homelab D1 schema: metrics + service_status tables, 7-day retention
- [x] Homelab pusher script deployed on NAS via systemd timer (2-min interval)
- [x] Homelab end-to-end verified: ingest → D1 read → API cache → homepage polling
- [x] Public `/api/status` endpoint with 30s edge cache and stale detection
- [x] Public `/api/_status/ingest` authenticated ingest endpoint
- [x] GitHub contribution heatmap via GitHub GraphQL API with 5-minute cache
- [x] Spotify currently-playing via OAuth refresh token flow
- [x] Weather via Open-Meteo API (Singapore, updated every 5 min)
- [x] Build-time environment display (Node, Bun, OS, commit hash); removed with the dashboard homepage in November 2026
- [x] Currently-reading widget (`content/currently` collection), now in the "Right now" block on `/now`
- [x] Terminal overlay (`` ` `` or Cmd+K) with 8 commands, now on `/projects/homelab`

## Milestone: Upkeep (shipped)

- [x] Dependency refresh within ranges; audit down from 127 to 5 documented exceptions
- [x] Node 26.13.0, Bun 1.4.4, Wrangler 4.160.1, and `@types/node` 26 pinned
- [x] Node 26 and better-sqlite3 13.0.3 upgraded; KaTeX 0.16.47 and TypeScript 5.9.3 deliberately kept
- [x] Typecheck, audit gate, CI, and Dependabot
- [x] Cloudflare compatibility dates 2026-11-01; dump noindex and baseline security headers
- [x] Homelab, Spotify, and GitHub secrets rotated
- [x] Rust homelab add-on refreshed to 0.1.6 with pinned toolchain and Docker images

## Milestone: Content & Polish (in progress)

- [x] Draft hygiene: unpublished outlines moved to `content/_drafts/` and out of the indexed `blog` collection
- [x] `/now` November 2026 entry
- [x] Fill in `/uses` page content (redesign still planned)
- [x] `/colophon` GitHub source link and current stack/font/content details
- [~] Publish remaining draft blog posts from `content/_drafts/`
- [x] Homelab project page rewritten for the NAS, Pi 5 and HA Yellow, with the live status panel on top
- [~] SG yields: static May 2026 snapshot on `/projects/fire-finance-math`; needs live rate wiring

## Milestone: Homepage restructure (in progress)

- [x] Site header, nav and footer moved into a Nuxt layout; any page can opt out with `layout: false`
- [x] Dashboard pieces moved: homelab panel and terminal to `/projects/homelab`, GitHub calendar to `/projects`, reading/Spotify/weather to `/now`, SG yields to `/projects/fire-finance-math`
- [x] Homelab panel shows the services the pushers report (no hand-kept list); random sparkline and heatmap fallbacks removed
- [x] Dropped: projects progress, latest posts, about and `/now` cards, header pills
- [x] Blank homepage placeholder and a dev-only `/lab` for experiments
- [ ] New homepage, chosen from the `/lab` experiments

## Milestone: Watches (in progress)

- [x] `watches` content collection with an allowlist schema (`shared/watches/schema.ts`)
- [x] `/watches` index (stats, owned / previously owned) and `/watches/<slug>` detail pages
- [x] `/watches/admired` page for watches admired but not owned (`status: admired`): Grand Seiko SLGW007, Omega Speedmaster Grey Side of the Moon
- [x] Admired page as a photo grid like `/watches`, with a public Shortlist section (`shortlist: true`)
- [x] Makers' product shots as the main photos (`--product` tiles, credited); own photos under "My photos"
- [x] Photo pipeline: EXIF/GPS stripping, AVIF + JPEG variants, hashed names (`bun run watches:photos`)
- [x] Leak guard test: undeclared frontmatter keys, amounts, and serials fail `bun run check`
- [x] Accuracy chart from timegrapher readings
- [x] Create R2 bucket `nickczj-media` (APAC location hint) and custom domain `media.nickczj.com`
- [~] Collection: 3 owned (Sea-Gull 1963, Drop Felix, MoonSwatch 1965) and 11 admired entries published; more watches to add
- [ ] On-wrist widget: NFC tag → Home Assistant → `/api/watches/wearing` → D1 → homepage

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
- [ ] Wire the SG yields snapshot to live Vesto/API data

## Milestone: Charm & Extras (future)

- [ ] Terminal-style 404 page (currently default Nuxt 404)
- [ ] Konami-code easter egg
- [ ] `/bookmarks` or `/linkroll` page
- [ ] Add Vesto project detail page to `/projects`
- [ ] Wire GitHub repo metadata to colophon
