---
title: Colophon
description: How nickczj.com is built — the stack, the choices, and the trade-offs.
updated: 2026-05-05
---

This site is built and deployed deliberately small. The goal is for the site itself to be a working showcase of the stack, not a generic portfolio shell.

## Stack

- **Framework:** [Nuxt 4](https://nuxt.com) on [Vue 3](https://vuejs.org). Server-side rendered at build time.
- **Runtime and package manager:** [Bun](https://bun.sh). Faster installs, single binary, fewer moving parts than Node + npm.
- **Content pipeline:** [`@nuxt/content`](https://content.nuxt.com) v3. Markdown files in `content/`, indexed at build time with SQLite (`better-sqlite3`) and queried from page components like a tiny embedded CMS.
- **Hosting:** [Cloudflare Pages](https://pages.cloudflare.com). Static prerendered output, edge-cached, no origin server to babysit.
- **Styling:** Plain CSS in `app/app.vue`. No Tailwind, no CSS-in-JS, no design system — the page count is small enough that a few hundred lines of CSS does the job, and the cascade is doing real work.
- **Type font:** Inter via system fallback chain. Loaded from the user's OS where available; no web-font network request.

## Why these choices

- **Why Nuxt over plain Vite or Astro:** I wanted file-based routing, SSG out of the box, and a content layer that doesn't require wiring up MDX manually. Nuxt Content gives that with one module.
- **Why Cloudflare Pages over Vercel/Netlify:** I already use Cloudflare for DNS and want CDN to be a feature I depend on, not a vendor lock-in. Pages keeps that boundary clean.
- **Why no Tailwind:** The site is small and the design language is mine, not a utility-class dialect. When the page surface grows enough to justify the abstraction, I'll revisit.

## Source

The source for this site is on GitHub — TODO: link once the remote is set.

## Credits

- Page structure inspired by the long tradition of personal sites that bother having a `/colophon` at all.
- The `/uses` page convention comes from [uses.tech](https://uses.tech/).
- The `/now` page convention comes from [nownownow.com](https://nownownow.com).
