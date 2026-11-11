---
title: Four-layer caching architecture for Vesto
description: Draft outline for Vesto's layered caching design.
date: 2026-05-01
tags:
  - Vesto
  - caching
  - architecture
draft: true
---

## Outline

- What the cache is protecting: latency, upstream cost, and user-visible freshness.
- The four layers and what each one owns.
- Cache invalidation rules and the places where stale data is acceptable.
- Failures observed during development and the final constraints.
- What should be measured before changing the design again.
