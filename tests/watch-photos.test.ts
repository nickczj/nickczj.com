import { afterAll, describe, expect, test } from 'bun:test'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import sharp from 'sharp'
import { photoSources, type PhotoManifest } from '../shared/watches/format'
import { photoIdFromFile, processPhoto, productPlate, variantWidths } from '../scripts/watch-photos'

const dirs: string[] = []
afterAll(async () => {
  await Promise.all(dirs.map(dir => rm(dir, { recursive: true, force: true })))
})

async function phoneLikeJpeg(): Promise<Buffer> {
  // Landscape pixels tagged with EXIF orientation 6 (rotate 90° CW), plus GPS
  // and camera EXIF, the way a phone camera saves a portrait shot.
  return sharp({ create: { width: 1800, height: 1200, channels: 3, background: { r: 40, g: 60, b: 50 } } })
    .jpeg()
    .withExif({
      IFD0: { Make: 'TestPhone', Model: 'TestPhone 1' },
      IFD3: { GPSLatitudeRef: 'N', GPSLatitude: '1/1 17/1 0/1', GPSLongitudeRef: 'E', GPSLongitude: '103/1 51/1 0/1' }
    })
    .withMetadata({ orientation: 6 })
    .toBuffer()
}

describe('watch photo pipeline', () => {
  test('variant widths never upscale and always include the largest size', () => {
    expect(variantWidths(4032)).toEqual([800, 1600, 2400])
    expect(variantWidths(2000)).toEqual([800, 1600, 2000])
    expect(variantWidths(1600)).toEqual([800, 1600])
    expect(variantWidths(640)).toEqual([640])
  })

  test('photo ids come from file names', () => {
    expect(photoIdFromFile('/exports/Hero.JPG')).toBe('hero')
    expect(photoIdFromFile('caseback shot (2).heic')).toBe('caseback-shot-2')
  })

  test('outputs are oriented, resized, and carry no EXIF, GPS, XMP, or ICC data', async () => {
    const input = await phoneLikeJpeg()
    const inputMeta = await sharp(input).metadata()
    expect(inputMeta.exif?.includes(Buffer.from('TestPhone'))).toBe(true)
    expect(inputMeta.orientation).toBe(6)

    const outDir = await mkdtemp(join(tmpdir(), 'watch-photos-test-'))
    dirs.push(outDir)
    const { entry, files } = await processPhoto(input, { slug: 'test-watch', id: 'hero', outDir })

    // Orientation 6 means the stored landscape is displayed as portrait.
    expect(entry.w).toBe(1200)
    expect(entry.h).toBe(1800)
    expect(entry.widths).toEqual([800, 1200])
    expect(entry.color).toMatch(/^#[0-9a-f]{6}$/)
    expect(files).toHaveLength(4)

    for (const file of files) {
      const meta = await sharp(file.path).metadata()
      expect(meta.exif).toBeUndefined()
      expect(meta.xmp).toBeUndefined()
      expect(meta.iptc).toBeUndefined()
      expect(meta.icc).toBeUndefined()
      expect(meta.orientation).toBeUndefined()
      expect(meta.width).toBe(file.width)
      expect(meta.height).toBe(file.height)
      expect(meta.height! > meta.width!).toBe(true)
      expect(file.key).toMatch(new RegExp(`^watches/test-watch/hero\\.${entry.v}-(800|1200)\\.(avif|jpg)$`))
    }
  })

  test('the same original always produces the same file names', async () => {
    const input = await phoneLikeJpeg()
    const outDir = await mkdtemp(join(tmpdir(), 'watch-photos-test-'))
    dirs.push(outDir)
    const first = await processPhoto(input, { slug: 'test-watch', id: 'hero', outDir })
    const second = await processPhoto(input, { slug: 'test-watch', id: 'hero', outDir })
    expect(second.entry.v).toBe(first.entry.v)
  })

  test('photo sources build srcsets from the manifest', () => {
    const manifest: PhotoManifest = {
      'test-watch': { hero: { v: 'abc123', w: 2400, h: 3000, widths: [800, 1600, 2400], color: '#334455' } }
    }
    const sources = photoSources(manifest, 'https://media.example/', 'test-watch', 'hero')
    expect(sources).not.toBeNull()
    expect(sources!.avif).toBe([
      'https://media.example/watches/test-watch/hero.abc123-800.avif 800w',
      'https://media.example/watches/test-watch/hero.abc123-1600.avif 1600w',
      'https://media.example/watches/test-watch/hero.abc123-2400.avif 2400w'
    ].join(', '))
    expect(sources!.fallback).toBe('https://media.example/watches/test-watch/hero.abc123-1600.jpg')
    expect(sources!.full).toBe('https://media.example/watches/test-watch/hero.abc123-2400.jpg')
    expect(sources!.social).toBe('https://media.example/watches/test-watch/hero.abc123-1600.jpg')
    expect(sources!.product).toBe(false)
    expect(photoSources(manifest, 'https://media.example', 'test-watch', 'missing')).toBeNull()
  })
})

/** A dark "watch" rectangle at (left, top) on a canvas of the given background. */
async function productShot(options: {
  width: number
  height: number
  watch: { left: number, top: number, width: number, height: number }
  background: { r: number, g: number, b: number, alpha: number }
}): Promise<Buffer> {
  const { watch } = options
  const body = await sharp({ create: { width: watch.width, height: watch.height, channels: 4, background: { r: 30, g: 30, b: 35, alpha: 1 } } })
    .png()
    .toBuffer()
  return sharp({ create: { width: options.width, height: options.height, channels: 4, background: options.background } })
    .composite([{ input: body, left: watch.left, top: watch.top }])
    .png()
    .toBuffer()
}

async function pixel(buffer: Buffer, x: number, y: number): Promise<number[]> {
  const { data, info } = await sharp(buffer).raw().toBuffer({ resolveWithObject: true })
  const i = (y * info.width + x) * info.channels
  return [...data.subarray(i, i + 3)]
}

describe('product shots', () => {
  test('a transparent cut-out becomes a 4:5 white tile with even margins', async () => {
    const input = await productShot({
      width: 1000,
      height: 1000,
      watch: { left: 300, top: 100, width: 300, height: 800 },
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    const { buffer, background } = await productPlate(input)
    const meta = await sharp(buffer).metadata()

    expect(background).toEqual({ r: 255, g: 255, b: 255 })
    expect(meta.hasAlpha).toBe(false)
    // 800 px tall watch + 8% (64 px) margins → 928 tall, 742 wide at 4:5.
    expect(meta.height).toBe(928)
    expect(meta.width).toBe(742)
    expect(await pixel(buffer, 0, 0)).toEqual([255, 255, 255])
    // The watch is centred: equal white on both sides.
    expect(await pixel(buffer, 370, 64)).toEqual([30, 30, 35])
    expect(await pixel(buffer, 370, 63)).toEqual([255, 255, 255])
  })

  test('a plain background keeps its own colour', async () => {
    const input = await productShot({
      width: 1200,
      height: 1200,
      watch: { left: 400, top: 200, width: 400, height: 800 },
      background: { r: 242, g: 241, b: 238, alpha: 1 }
    })
    const { buffer, background } = await productPlate(input)
    expect(background).toEqual({ r: 242, g: 241, b: 238 })
    expect(await pixel(buffer, 0, 0)).toEqual([242, 241, 238])
  })

  test('a strap cut off by the frame stays cut at the tile edge', async () => {
    const input = await productShot({
      width: 1000,
      height: 1000,
      watch: { left: 350, top: 0, width: 300, height: 1000 },
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    })
    const { buffer } = await productPlate(input)
    const meta = await sharp(buffer).metadata()
    expect(meta.height).toBe(1000)
    expect(meta.width).toBe(800)
    expect(await pixel(buffer, 400, 0)).toEqual([30, 30, 35])
    expect(await pixel(buffer, 400, 999)).toEqual([30, 30, 35])
  })

  test('processing records the tile colour and marks the entry as a product shot', async () => {
    const input = await productShot({
      width: 1000,
      height: 1000,
      watch: { left: 300, top: 100, width: 300, height: 800 },
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    const outDir = await mkdtemp(join(tmpdir(), 'watch-photos-test-'))
    dirs.push(outDir)
    const product = await processPhoto(input, { slug: 'test-watch', id: 'product', outDir, product: true })
    const plain = await processPhoto(input, { slug: 'test-watch', id: 'product', outDir })

    expect(product.entry.product).toBe(true)
    expect(product.entry.color).toBe('#ffffff')
    expect(product.entry.w / product.entry.h).toBeCloseTo(0.8, 2)
    expect(plain.entry.product).toBeUndefined()
    // Different processing of the same original must not reuse its URLs.
    expect(product.entry.v).not.toBe(plain.entry.v)

    const manifest: PhotoManifest = { 'test-watch': { product: product.entry } }
    expect(photoSources(manifest, 'https://media.example', 'test-watch', 'product')!.product).toBe(true)
  })
})
