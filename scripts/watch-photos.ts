#!/usr/bin/env bun
/**
 * Prepare watch photos for nickczj.com/watches.
 *
 *   bun run watches:photos <slug> <photo...> [--upload] [--bucket <name>]
 *
 * Each input becomes a photo id taken from its file name (`hero.jpg` → `hero`).
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

export async function processPhoto(
  input: Buffer,
  options: { slug: string, id: string, outDir?: string }
): Promise<ProcessedPhoto> {
  const { slug, id } = options
  const outDir = options.outDir ?? DEFAULT_OUT_DIR

  const meta = await sharp(input).metadata()
  const width = meta.autoOrient?.width ?? meta.width
  const height = meta.autoOrient?.height ?? meta.height
  if (!width || !height) throw new Error(`${slug}/${id}: could not read image dimensions`)
  if (width < 800) console.warn(`  ! ${slug}/${id} is only ${width}px wide; it will look soft on large screens`)

  const v = createHash('sha256').update(input).update(`pipeline-${PIPELINE_VERSION}`).digest('hex').slice(0, 10)
  const widths = variantWidths(width)
  const { dominant } = await sharp(input).autoOrient().stats()

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
    entry: { v, w: largest, h: Math.round((largest * height) / width), widths, color: toHex(dominant) },
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
  console.error('usage: bun run watches:photos <slug> <photo...> [--upload] [--bucket <name>]')
  process.exit(2)
}

async function main(argv: string[]): Promise<void> {
  const positional: string[] = []
  let shouldUpload = false
  let bucket = process.env.WATCH_MEDIA_BUCKET || DEFAULT_BUCKET

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!
    if (arg === '--upload') shouldUpload = true
    else if (arg === '--bucket') bucket = argv[++i] ?? usage()
    else if (arg === '-h' || arg === '--help') usage()
    else if (arg.startsWith('--')) usage()
    else positional.push(arg)
  }

  const [slug, ...inputs] = positional
  if (!slug || !inputs.length) usage()
  if (!SLUG_PATTERN.test(slug)) throw new Error(`slug must be kebab-case: ${slug}`)
  if (!existsSync(join(ROOT, 'content', 'watches', `${slug}.md`))) {
    console.warn(`  ! content/watches/${slug}.md does not exist yet`)
  }

  const manifest = await readManifest()
  const scratch = await mkdtemp(join(tmpdir(), 'watch-photos-'))
  const processed: { id: string, files: OutputFile[] }[] = []

  try {
    for (const input of inputs) {
      const id = photoIdFromFile(input)
      if (!SLUG_PATTERN.test(id)) throw new Error(`${input}: cannot derive a photo id from the file name`)
      const result = await processPhoto(await readInput(input, scratch), { slug, id })
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
  for (const { id } of processed) console.log(`  - id: ${id}\n    alt: ""`)
}

if (import.meta.main) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  })
}
