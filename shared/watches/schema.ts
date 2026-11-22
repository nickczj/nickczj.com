import { z } from 'zod'

// Everything a watch file contains is public: this repository is public on
// GitHub, the pages are prerendered, and Nuxt Content serves every collection
// as a SQL dump (`/dump.watches.sql`, `/__nuxt_content/watches/sql_dump.txt`),
// including frontmatter keys that are not declared here.
//
// So this schema is an allowlist. Do not add fields for purchase price, serial
// or case numbers, receipts, warranty cards, insurance values, or where a watch
// is kept. `tests/watches-content.test.ts` fails the build on unknown keys.

export const MOVEMENT_TYPES = ['automatic', 'manual', 'quartz', 'spring-drive', 'solar'] as const
// `owned` and `sold` make up the collection at /watches. `admired` is for
// watches admired but not owned; they are listed at /watches/admired.
// Buying one is a one-line change to `owned`, and the URL stays the same.
export const WATCH_STATUSES = ['owned', 'sold', 'admired'] as const
export const COLLECTION_STATUSES = ['owned', 'sold'] as const

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/** Static routes under /watches/ that a watch file name would collide with. */
export const RESERVED_SLUGS = ['admired'] as const

const slug = z.string().regex(SLUG_PATTERN)
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
const positive = z.number().positive()

const movement = z.object({
  type: z.enum(MOVEMENT_TYPES),
  caliber: z.string().optional(),
  base: z.string().optional(),
  vph: z.number().int().positive().optional(),
  power_reserve_h: positive.optional(),
  jewels: z.number().int().nonnegative().optional(),
  hacking: z.boolean().optional(),
  hand_winding: z.boolean().optional(),
  // e.g. "COSC chronometer"
  certification: z.string().optional()
}).strict()

const watchCase = z.object({
  diameter_mm: positive.optional(),
  thickness_mm: positive.optional(),
  lug_to_lug_mm: positive.optional(),
  lug_width_mm: positive.optional(),
  material: z.string().optional(),
  // e.g. "sapphire display back"
  back: z.string().optional()
}).strict()

const photo = z.object({
  id: slug,
  alt: z.string().min(1)
}).strict()

const accuracyReading = z.object({
  date: isoDate,
  seconds_per_day: z.number().min(-120).max(120),
  note: z.string().optional()
}).strict()

export const watchSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  brand: z.string().min(1),
  model: z.string().optional(),
  reference: z.string().optional(),
  nickname: z.string().optional(),
  status: z.enum(WATCH_STATUSES).default('owned'),
  // Year only: a day-precise purchase date is more than friends need.
  acquired: z.number().int().min(1900).max(2100).optional(),
  movement,
  complications: z.array(z.string()).default([]),
  case: watchCase.default({}),
  water_resistance_m: z.number().int().nonnegative().optional(),
  crystal: z.string().optional(),
  dial: z.string().optional(),
  strap: z.string().optional(),
  // The brand's page for the reference. Not a shop listing: those carry prices.
  link: z.string().url().startsWith('https://').optional(),
  photos: z.array(photo).default([]),
  accuracy: z.array(accuracyReading).default([]),
  tags: z.array(z.string()).default([])
})

/** Frontmatter as authored: unknown keys at any level are rejected. */
export const watchFrontmatterSchema = watchSchema.strict()

export type WatchFrontmatter = z.infer<typeof watchSchema>
/** Shape before defaults apply; what Nuxt Content's generated item types match. */
export type WatchInput = z.input<typeof watchSchema>
export type MovementType = (typeof MOVEMENT_TYPES)[number]
export type WatchStatus = (typeof WATCH_STATUSES)[number]
export type AccuracyReading = z.infer<typeof accuracyReading>
