---
# Copy to content/watches/<brand>-<model>.md (kebab-case); the file name is the URL.
# Everything in a published watch file is public: this repo is public and the
# site serves the whole collection as a SQL dump. Only the fields below are
# allowed (tests/watches-content.test.ts enforces it). Never add what you
# paid, identifying numbers, receipts, insurance values, or where it is kept.
title: Brand Model
description: One sentence on what it is and why it's here; used in link previews.
brand: Brand
model: Model
reference: REF-123
nickname: Optional nickname
status: owned            # owned | wishlist | sold
acquired: 2024           # year only
movement:
  type: automatic        # automatic | manual | quartz | spring-drive | solar
  caliber: Cal. 0000
  base: Optional base movement
  vph: 28800
  power_reserve_h: 42
  jewels: 25
  hacking: true
  hand_winding: true
  certification: COSC chronometer
complications: [date]
case:
  diameter_mm: 39
  thickness_mm: 12
  lug_to_lug_mm: 47
  lug_width_mm: 20
  material: steel
  back: sapphire display back
water_resistance_m: 100
crystal: sapphire
dial: black
strap: steel bracelet
photos:                  # ids from `bun run watches:photos <slug> <files>`
  - id: hero
    alt: Describe the photo for screen readers
accuracy:                # timegrapher or app readings, seconds per day
  - date: 2026-11-01
    seconds_per_day: 3
    note: dial up, full wind
tags: [diver]
---

Why it's in the collection, how it wears, what's been serviced. Plain Markdown.
