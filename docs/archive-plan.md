# Version Archive Plan

> Captured 2026-05-07 for future implementation. See `ROADMAP.md` milestone: Version Archive.

## Goal

Showcase past versions of nickczj.com under the nickczj.com domain. Not simple redirects — the old versions should feel like they live under the same roof.

## Background

- **v1**: Fully deprecated. No longer accessible online. Stack and code may be lost.
- **v2**: Accessible at `stoic-bell-9f7143.netlify.app` (Netlify-hosted). Still live.
- **v3**: Current site. Nuxt 4 + Vue 3 + Bun on Cloudflare Pages (this repo).

## Recommended Architecture

Two-layer approach:

### Layer 1: `/archive` Page on the Main Site

Primary entry point. A browsable gallery/timeline of all past versions with context.

- **Route:** `/archive` (new page at `app/pages/archive.vue`)
- **Data source:** `app/data/archive.ts` (follows the `app/data/projects.ts` pattern)
- **Content per version:** version number, title, description, tech stack, date range, deployment status, screenshot paths, live URL if accessible
- **Design:** Cards or timeline showing each version with screenshots, tech stack tags, and action buttons

v1 entry on the archive page:
- Screenshots if recoverable, otherwise description + stack notes
- Link to Wayback Machine snapshots (`web.archive.org/web/*/nickczj.com`)

v2 entry:
- Screenshots from the live Netlify site
- "Visit v2.nickczj.com" button

v3 entry:
- Current site label, link to homepage

### Layer 2: `v2.nickczj.com` Subdomain for Live Preview

**Option A (recommended — lowest friction):**
Keep v2 on Netlify, alias under nickczj.com via DNS:
- Cloudflare DNS: `v2.nickczj.com CNAME stoic-bell-9f7143.netlify.app` (proxied)
- Netlify: Add `v2.nickczj.com` as custom domain on the stoic-bell site
- Cloudflare handles SSL and proxying; Netlify handles hosting

**Option B (more integrated):**
Migrate v2 to a second Cloudflare Pages project if source code is available.

**Recommendation:** Start with Option A. 5-minute setup, no code migration needed.

## Implementation Steps

1. Create `app/data/archive.ts` — typed version archive data
2. Create `app/pages/archive.vue` — archive gallery page
3. Update navigation — add Archive link to homepage and shared shell
4. Update `nuxt.config.ts` — add `/archive` to prerender routes
5. DNS setup for v2 subdomain
6. Capture screenshots of v2, place in `public/archive/v2/`
7. Recover v1 info (Wayback Machine, old screenshots, git history)

## Data Schema (draft)

```typescript
interface ArchiveVersion {
  version: string        // "v1" | "v2" | "v3"
  title: string          // "Version 2 (2023-2025)"
  description: string
  stack: string[]
  dateRange: string      // "2023 - 2025"
  deployment: string     // "Netlify", "Cloudflare Pages", etc.
  url?: string           // live URL if accessible
  images: string[]       // screenshot paths under public/
  status: 'deprecated' | 'archived' | 'current'
  notes?: string
}
```

## Edge Cases

- **v2 X-Frame-Options:** If the archive page attempts to iframe v2, Netlify may block it. Prefer linking to the subdomain rather than iframing.
- **v1 Wayback Machine:** Verify snapshots exist before adding the link.
- **Screenshots:** Need to be manually captured. Place in `public/archive/`.
- **Mobile:** Archive page should follow existing responsive patterns in the project.

## Files to Create/Modify

| File | Action |
|------|--------|
| `app/data/archive.ts` | Create |
| `app/pages/archive.vue` | Create |
| `app/pages/index.vue` | Edit — add archive nav link |
| `app/app.vue` | Edit — add archive nav link |
| `nuxt.config.ts` | Edit — add `/archive` to prerender |
