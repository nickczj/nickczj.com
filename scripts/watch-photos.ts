#!/usr/bin/env bun
/**
 * Prepare watch photos for nickczj.com/watches.
 *
 *   bun run watches:photos <slug> <photo...> [--product] [--id <id>] [--upload] [--bucket <name>]
 *
 * Each input becomes a photo id taken from its file name (`hero.jpg` → `hero`),
 * or from `--id` when there is a single input.
 *
 * `--product` is for a maker's product shot (a cut-out or a plain background):
 * it trims to the watch, adds even margins, and pads to a 4:5 tile on the
 * image's own background (white for transparent images), so brand photos line
 * up in the grid. Credit the maker in the frontmatter (`credit`, `source`).
 *
 * The script:
 *   1. applies EXIF orientation, converts to sRGB, and strips every metadata
 *      block (EXIF, GPS, XMP, IPTC, ICC), then checks that the output has none;
 *   2. writes AVIF + JPEG variants at 800/1600/2400 px (never upscaled) to
 *      `.cache/watch-photos/watches/<slug>/<id>.<hash>-<width>.<ext>`;
 *   3. records dimensions and a placeholder colour in `app/data/watch-photos.json`;
 *   4. with `--upload`, puts the variants in the R2 bucket served at
 *      media.nickczj.com, using the repo's pinned Wrangler.
 *
 * HEIC/HEIF exports from Photos or Immich are converted with macOS `sips` first.
 * File names carry a content hash, so re-shooting a photo produces new URLs and
 * the variants can be cached as immutable.
 */
import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, extname, join, resolve } from 'node:path'
import sharp from 'sharp'
import { SLUG_PATTERN } from '../shared/watches/schema'
import {
  PHOTO_FORMATS,
  photoKey,
  type PhotoManifest,
  type PhotoManifestEntry
} from '../shared/watches/format'

/** Bump when the processing below changes, so every URL changes with it. */
export const PIPELINE_VERSION = 1
export const TARGET_WIDTHS = [800, 1600, 2400] as const
export const DEFAULT_BUCKET = 'nickczj-media'
export const CACHE_CONTROL = 'public, max-age=31536000, immutable'

const ROOT = resolve(import.meta.dir, '..')
export const DEFAULT_OUT_DIR = join(ROOT, '.cache', 'watch-photos')
export const MANIFEST_PATH = join(ROOT, 'app', 'data', 'watch-photos.json')

export interface OutputFile {
  path: string
  key: string
  contentType: string
  width: number
  height: number
}

export interface ProcessedPhoto {
  entry: PhotoManifestEntry
  files: OutputFile[]
}

export function variantWidths(originalWidth: number): number[] {
  const largest = Math.min(originalWidth, TARGET_WIDTHS[TARGET_WIDTHS.length - 1]!)
  const widths = TARGET_WIDTHS.filter(width => width < largest) as number[]
  widths.push(largest)
  return widths
}

export function photoIdFromFile(file: string): string {
  return basename(file, extname(file))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function toHex({ r, g, b }: { r: number, g: number, b: number }): string {
  return '#' + [r, g, b].map(channel => Math.round(channel).toString(16).padStart(2, '0')).join('')
}

async function assertNoMetadata(buffer: Buffer, label: string): Promise<void> {
  const meta = await sharp(buffer).metadata()
  const leaked = (['exif', 'xmp', 'iptc', 'icc'] as const).filter(key => meta[key])
  if (leaked.length) {
    throw new Error(`${label}: output still contains ${leaked.join(', ')} metadata`)
  }
}

/** Product tiles are 4:5, like the cards. */
export const PRODUCT_ASPECT = 4 / 5
/** Margin around the watch, as a share of its longer side. */
export const PRODUCT_MARGIN = 0.08

type Rgb = { r: number, g: number, b: number }

/**
 * Turn a maker's product shot into a tile: find the watch against a transparent
 * or plain background, crop to it, add margins, and pad towards 4:5 with the
 * background colour. An edge the watch already touches (a strap cut off by the
 * frame) gets no margin, so the cut stays at the tile's edge.
 */
export async function productPlate(input: Buffer): Promise<{ buffer: Buffer, background: Rgb }> {
  const { data, info } = await sharp(input).autoOrient().ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const { width: W, height: H } = info
  const at = (x: number, y: number) => (y * W + x) * 4

  const corners = [at(0, 0), at(W - 1, 0), at(0, H - 1), at(W - 1, H - 1)]
  const transparent = corners.every(i => data[i + 3]! < 16)
  const background: Rgb = transparent
    ? { r: 255, g: 255, b: 255 }
    : {
        r: Math.round(corners.reduce((sum, i) => sum + data[i]!, 0) / 4),
        g: Math.round(corners.reduce((sum, i) => sum + data[i + 1]!, 0) / 4),
        b: Math.round(corners.reduce((sum, i) => sum + data[i + 2]!, 0) / 4)
      }

  let left = W, right = -1, top = H, bottom = -1
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = at(x, y)
      const alpha = data[i + 3]!
      const content = transparent
        ? alpha > 12
        : alpha > 12 && Math.max(
          Math.abs(data[i]! - background.r),
          Math.abs(data[i + 1]! - background.g),
          Math.abs(data[i + 2]! - background.b)
        ) > 18
      if (!content) continue
      if (x < left) left = x
      if (x > right) right = x
      if (y < top) top = y
      if (y > bottom) bottom = y
    }
  }
  if (right < 0) throw new Error('could not find the watch against the background')

  const cw = right - left + 1
  const ch = bottom - top + 1
  const bleeds = { left: left <= 1, right: right >= W - 2, top: top <= 1, bottom: bottom >= H - 2 }
  const margin = Math.round(PRODUCT_MARGIN * Math.max(cw, ch))
  const pad = {
    left: bleeds.left ? 0 : margin,
    right: bleeds.right ? 0 : margin,
    top: bleeds.top ? 0 : margin,
    bottom: bleeds.bottom ? 0 : margin
  }

  // Grow the short axis towards 4:5, only on sides the watch doesn't touch.
  const share = (extra: number, a: 'left' | 'top', b: 'right' | 'bottom') => {
    if (bleeds[a] && bleeds[b]) return
    if (bleeds[a]) pad[b] += extra
    else if (bleeds[b]) pad[a] += extra
    else {
      pad[a] += Math.floor(extra / 2)
      pad[b] += Math.ceil(extra / 2)
    }
  }
  const w = cw + pad.left + pad.right
  const h = ch + pad.top + pad.bottom
  if (w / h < PRODUCT_ASPECT) share(Math.round(h * PRODUCT_ASPECT) - w, 'left', 'right')
  else if (w / h > PRODUCT_ASPECT) share(Math.round(w / PRODUCT_ASPECT) - h, 'top', 'bottom')

  const buffer = await sharp(data, { raw: { width: W, height: H, channels: 4 } })
    .extract({ left, top, width: cw, height: ch })
    .extend({ ...pad, background: { ...background, alpha: 1 } })
    .flatten({ background })
    .png()
    .toBuffer()
  return { buffer, background }
}

export async function processPhoto(
  original: Buffer,
  options: { slug: string, id: string, outDir?: string, product?: boolean }
): Promise<ProcessedPhoto> {
  const { slug, id } = options
  const outDir = options.outDir ?? DEFAULT_OUT_DIR

  const plate = options.product ? await productPlate(original) : null
  const input = plate?.buffer ?? original

  const meta = await sharp(input).metadata()
  const width = meta.autoOrient?.width ?? meta.width
  const height = meta.autoOrient?.height ?? meta.height
  if (!width || !height) throw new Error(`${slug}/${id}: could not read image dimensions`)
  if (width < 800) console.warn(`  ! ${slug}/${id} is only ${width}px wide; it will look soft on large screens`)

  const hash = createHash('sha256').update(original).update(`pipeline-${PIPELINE_VERSION}`)
  if (plate) hash.update('product')
  const v = hash.digest('hex').slice(0, 10)
  const widths = variantWidths(width)
  const color = plate ? plate.background : (await sharp(input).autoOrient().stats()).dominant

  const dir = join(outDir, 'watches', slug)
  await mkdir(dir, { recursive: true })

  const files: OutputFile[] = []
  for (const w of widths) {
    const h = Math.round((w * height) / width)
    const resized = sharp(input).autoOrient().resize({ width: w, withoutEnlargement: true })
    for (const format of PHOTO_FORMATS) {
      const encoded = format.ext === 'avif'
        ? resized.clone().avif({ quality: 55, effort: 5 })
        : resized.clone().jpeg({ quality: 82, mozjpeg: true })
      const buffer = await encoded.toBuffer()
      const key = photoKey(slug, id, v, w, format.ext)
      await assertNoMetadata(buffer, key)
      const path = join(outDir, key)
      await writeFile(path, buffer)
      files.push({ path, key, contentType: format.contentType, width: w, height: h })
    }
  }

  const largest = widths[widths.length - 1]!
  return {
    entry: {
      v,
      w: largest,
      h: Math.round((largest * height) / width),
      widths,
      color: toHex(color),
      ...(plate ? { product: true } : {})
    },
    files
  }
}

async function readInput(file: string, scratch: string): Promise<Buffer> {
  const ext = extname(file).toLowerCase()
  if (ext !== '.heic' && ext !== '.heif') return readFile(file)

  if (process.platform !== 'darwin') {
    throw new Error(`${file}: HEIC needs macOS sips; export as JPEG instead`)
  }
  const converted = join(scratch, `${photoIdFromFile(file)}.jpg`)
  const proc = Bun.spawn(['sips', '-s', 'format', 'jpeg', '-s', 'formatOptions', '95', file, '--out', converted], {
    stdout: 'ignore',
    stderr: 'inherit'
  })
  if (await proc.exited !== 0) throw new Error(`${file}: sips could not convert HEIC`)
  return readFile(converted)
}

export async function readManifest(path = MANIFEST_PATH): Promise<PhotoManifest> {
  if (!existsSync(path)) return {}
  return JSON.parse(await readFile(path, 'utf-8')) as PhotoManifest
}

export async function writeManifest(manifest: PhotoManifest, path = MANIFEST_PATH): Promise<void> {
  const sorted: PhotoManifest = {}
  for (const slug of Object.keys(manifest).sort()) {
    const photos = manifest[slug]!
    sorted[slug] = {}
    for (const id of Object.keys(photos).sort()) sorted[slug][id] = photos[id]!
  }
  await writeFile(path, JSON.stringify(sorted, null, 2) + '\n')
}

async function upload(files: OutputFile[], bucket: string): Promise<void> {
  const wrangler = join(ROOT, 'node_modules', '.bin', 'wrangler')
  for (const file of files) {
    const proc = Bun.spawn([
      wrangler, 'r2', 'object', 'put', `${bucket}/${file.key}`,
      '--file', file.path,
      '--content-type', file.contentType,
      '--cache-control', CACHE_CONTROL,
      '--remote'
    ], { cwd: ROOT, stdout: 'ignore', stderr: 'inherit' })
    if (await proc.exited !== 0) throw new Error(`upload failed: ${file.key}`)
    console.log(`  ↑ ${bucket}/${file.key}`)
  }
}

function usage(): never {
  console.error('usage: bun run watches:photos <slug> <photo...> [--product] [--id <id>] [--upload] [--bucket <name>]')
  process.exit(2)
}

async function main(argv: string[]): Promise<void> {
  const positional: string[] = []
  let shouldUpload = false
  let product = false
  let explicitId: string | undefined
  let bucket = process.env.WATCH_MEDIA_BUCKET || DEFAULT_BUCKET

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!
    if (arg === '--upload') shouldUpload = true
    else if (arg === '--product') product = true
    else if (arg === '--id') explicitId = argv[++i] ?? usage()
    else if (arg === '--bucket') bucket = argv[++i] ?? usage()
    else if (arg === '-h' || arg === '--help') usage()
    else if (arg.startsWith('--')) usage()
    else positional.push(arg)
  }

  const [slug, ...inputs] = positional
  if (!slug || !inputs.length) usage()
  if (!SLUG_PATTERN.test(slug)) throw new Error(`slug must be kebab-case: ${slug}`)
  if (explicitId !== undefined && inputs.length !== 1) throw new Error('--id needs exactly one photo')
  if (!existsSync(join(ROOT, 'content', 'watches', `${slug}.md`))) {
    console.warn(`  ! content/watches/${slug}.md does not exist yet`)
  }

  const manifest = await readManifest()
  const scratch = await mkdtemp(join(tmpdir(), 'watch-photos-'))
  const processed: { id: string, files: OutputFile[] }[] = []

  try {
    for (const input of inputs) {
      const id = explicitId ?? photoIdFromFile(input)
      if (!SLUG_PATTERN.test(id)) throw new Error(`${input}: cannot derive a photo id; pass --id`)
      const result = await processPhoto(await readInput(input, scratch), { slug, id, product })
      manifest[slug] = { ...manifest[slug], [id]: result.entry }
      processed.push({ id, files: result.files })
      console.log(`  ✓ ${slug}/${id}  ${result.entry.w}×${result.entry.h}  widths ${result.entry.widths.join('/')}  ${result.entry.v}`)
    }
  } finally {
    await rm(scratch, { recursive: true, force: true })
  }

  await writeManifest(manifest)
  console.log(`  ✓ manifest updated: app/data/watch-photos.json`)

  if (shouldUpload) {
    await upload(processed.flatMap(photo => photo.files), bucket)
  } else {
    console.log(`  · not uploaded; files are in .cache/watch-photos/ (re-run with --upload)`)
  }

  console.log('\nReference them in the watch frontmatter:\n\nphotos:')
  for (const { id } of processed) {
    console.log(`  - id: ${id}\n    alt: ""`)
    if (product) console.log(`    credit: ""        # the maker, e.g. Longines\n    source: ""        # https page the image came from`)
  }
  if (product) console.log('\nPut the product shot first so it is the card and hero image.')
}

if (import.meta.main) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  })
}
