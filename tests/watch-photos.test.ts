import { afterAll, describe, expect, test } from 'bun:test'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import sharp from 'sharp'
import { photoSources, type PhotoManifest } from '../shared/watches/format'
import { photoIdFromFile, processPhoto, variantWidths } from '../scripts/watch-photos'

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
    expect(photoSources(manifest, 'https://media.example', 'test-watch', 'missing')).toBeNull()
  })
})
