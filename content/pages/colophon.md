---
title: Colophon
description: How nickczj.com is built — the stack, the choices, and the trade-offs.
updated: 2026-11-11
---

This site is built and deployed deliberately small. The goal is for the site itself to be a working showcase of the stack, not a generic portfolio shell.

## Stack

- **Framework:** [Nuxt 4](https://nuxt.com) on [Vue 3](https://vuejs.org). Pages are prerendered at build time; the live integrations run as Cloudflare Pages Functions.
- **Runtime and package manager:** [Bun](https://bun.sh) for installs, tests, and the build. Node 24 is pinned for tooling and CI.
- **Content pipeline:** [`@nuxt/content`](https://content.nuxt.com) v3. Markdown files in `content/`, indexed at build time with SQLite (`better-sqlite3`) and served from D1 in production.
- **Hosting:** [Cloudflare Pages](https://pages.cloudflare.com). Static prerendered output, D1 for homelab telemetry, and Pages Functions for the APIs. No origin server to babysit.
- **Live data:** homelab status from D1, GitHub contributions via the GraphQL API, Spotify now-playing via OAuth, and weather from Open-Meteo.
- **Math:** KaTeX via `remark-math` and `rehype-katex` for the finance and technical write-ups.
- **Styling:** Plain CSS. Shared shell styles live in `app/app.vue`; the homepage dashboard lives in `app/assets/home.css`. No Tailwind, no CSS-in-JS, no design system — the page count is small enough that a few hundred lines of CSS does the job.
- **Type:** Inter for sans, JetBrains Mono for code, and Newsreader for serif headings. The homepage loads them from Google Fonts; everything else falls back to the system stack.

## Why these choices

- **Why Nuxt over plain Vite or Astro:** I wanted file-based routing, SSG out of the box, and a content layer that doesn't require wiring up MDX manually. Nuxt Content gives that with one module, and Nuxt handles the server routes for the live data.
- **Why Cloudflare Pages over Vercel/Netlify:** I already use Cloudflare for DNS and want CDN to be a feature I depend on, not a vendor lock-in. Pages keeps that boundary clean, and D1 keeps the homelab telemetry next to the site.
- **Why no Tailwind:** The site is small and the design language is mine, not a utility-class dialect. When the page surface grows enough to justify the abstraction, I'll revisit.

## Source

The source for this site is on [GitHub](https://github.com/nickczj/nickczj.com).

## Credits

- Page structure inspired by the long tradition of personal sites that bother having a `/colophon` at all.
- The `/uses` page convention comes from [uses.tech](https://uses.tech/).
- The `/now` page convention comes from [nownownow.com](https://nownownow.com).
