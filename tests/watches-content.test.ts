import { describe, expect, test } from 'bun:test'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { RESERVED_SLUGS, SLUG_PATTERN, watchFrontmatterSchema } from '../shared/watches/schema'
import { compareAdmired, hasWriteUp, specLine, specRows, type PhotoManifest } from '../shared/watches/format'

// The repo is public and Nuxt Content serves every collection as a SQL dump,
// so anything written in content/watches/ is published. This suite is the
// guard: it rejects undeclared frontmatter keys and obvious private details
// before they reach a commit or a deploy.

const ROOT = resolve(import.meta.dir, '..')
const PUBLISHED_DIR = join(ROOT, 'content', 'watches')
const DRAFTS_DIR = join(ROOT, 'content', '_drafts', 'watches')
const manifest = JSON.parse(readFileSync(join(ROOT, 'app', 'data', 'watch-photos.json'), 'utf-8')) as PhotoManifest

const PRIVATE_PATTERNS: { label: string, pattern: RegExp }[] = [
  { label: 'a price or amount', pattern: /(?:S\$|SGD|US\$|USD|CHF|EUR|GBP|JPY|HK\$|€|£|¥|\$)\s?\d/i },
  { label: 'a serial number', pattern: /\b(?:serial|s\/n\b|case (?:no\b|number))/i }
]

function markdownFiles(dir: string): string[] {
  if (!existsSync(dir)) return []
  return readdirSync(dir).filter(name => name.endsWith('.md')).sort().map(name => join(dir, name))
}

function splitFrontmatter(source: string): { data: unknown, body: string } {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/)
  if (!match) throw new Error('missing frontmatter block')
  return { data: Bun.YAML.parse(match[1]!), body: match[2]! }
}

const published = markdownFiles(PUBLISHED_DIR)
const drafts = markdownFiles(DRAFTS_DIR)

describe('watch content', () => {
  test('the draft template exists and is valid', () => {
    expect(drafts.some(file => file.endsWith('_template.md'))).toBe(true)
  })

  for (const file of [...published, ...drafts]) {
    const name = file.slice(ROOT.length + 1)
    const isPublished = file.startsWith(PUBLISHED_DIR + '/')

    describe(name, () => {
      const source = readFileSync(file, 'utf-8')
      const { data, body } = splitFrontmatter(source)

      test('frontmatter uses only declared fields', () => {
        const result = watchFrontmatterSchema.safeParse(data)
        if (!result.success) {
          const issues = result.error.issues.map(issue => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
          throw new Error(`invalid watch frontmatter\n  ${issues.join('\n  ')}`)
        }
      })

      test('contains no prices or serial numbers', () => {
        for (const { label, pattern } of PRIVATE_PATTERNS) {
          const hit = source.match(pattern)
          if (hit) throw new Error(`looks like ${label}: "${hit[0]}". Keep it out of the public repo.`)
        }
      })

      if (isPublished) {
        const slug = name.replace(/^content\/watches\//, '').replace(/\.md$/, '')

        test('file name is a kebab-case slug', () => {
          expect(slug).toMatch(SLUG_PATTERN)
        })

        test('file name does not shadow a /watches/ page', () => {
          expect(RESERVED_SLUGS as readonly string[]).not.toContain(slug)
        })

        test('product shots credit the maker and link to where they came from', () => {
          const parsed = watchFrontmatterSchema.safeParse(data)
          if (!parsed.success) return
          const uncredited = parsed.data.photos
            .filter(photo => manifest[slug]?.[photo.id]?.product && !(photo.credit && photo.source))
            .map(photo => photo.id)
          if (uncredited.length) throw new Error(`add credit and source for: ${uncredited.join(', ')}`)
          const sourceOnly = parsed.data.photos.filter(photo => photo.source && !photo.credit).map(photo => photo.id)
          if (sourceOnly.length) throw new Error(`a source needs a credit: ${sourceOnly.join(', ')}`)
        })

        test('every listed photo has been processed', () => {
          const parsed = watchFrontmatterSchema.safeParse(data)
          if (!parsed.success) return
          const missing = parsed.data.photos.filter(photo => !manifest[slug]?.[photo.id]).map(photo => photo.id)
          if (missing.length) {
            throw new Error(`run \`bun run watches:photos ${slug} <files>\` for: ${missing.join(', ')}`)
          }
        })

        // Admired watches can be a card only; anything in the collection needs a write-up.
        const status = (data as { status?: string } | null)?.status ?? 'owned'
        if (status !== 'admired') {
          test('has a body', () => {
            expect(body.trim().length).toBeGreaterThan(0)
          })
        }
      }
    })
  }
})

describe('watch schema', () => {
  const minimal = {
    title: 'Example',
    description: 'An example watch.',
    brand: 'Brand',
    status: 'admired',
    movement: { type: 'manual' }
  }

  test('accepts an admired watch with only the required fields', () => {
    expect(watchFrontmatterSchema.safeParse(minimal).success).toBe(true)
  })

  test('rejects the old wishlist status', () => {
    expect(watchFrontmatterSchema.safeParse({ ...minimal, status: 'wishlist' }).success).toBe(false)
  })

  test('links must be https URLs', () => {
    expect(watchFrontmatterSchema.safeParse({ ...minimal, link: 'https://example.com/watch' }).success).toBe(true)
    expect(watchFrontmatterSchema.safeParse({ ...minimal, link: 'http://example.com/watch' }).success).toBe(false)
    expect(watchFrontmatterSchema.safeParse({ ...minimal, link: 'example.com/watch' }).success).toBe(false)
  })

  test('a write-up is a non-empty Markdown body', () => {
    expect(hasWriteUp({ body: { value: [['p', {}, 'text']] } })).toBe(true)
    expect(hasWriteUp({ body: { value: [] } })).toBe(false)
    expect(hasWriteUp({})).toBe(false)
  })

  test('spec rows skip fields the content database returns as null', () => {
    // Nuxt Content stores a missing top-level number as SQL NULL, not undefined.
    const rows = specRows({
      movement: { type: 'manual', caliber: '3861' },
      water_resistance_m: null as unknown as undefined
    })
    expect(rows.map(row => row.label)).toEqual(['Movement'])
    expect(specRows({ movement: { type: 'manual' }, water_resistance_m: 0 }).find(row => row.label === 'Water resistance')?.value).toBe('0 m')
  })

  test('sizes keep the maker\'s precision', () => {
    expect(specLine({ movement: { type: 'automatic', caliber: '9300' }, case: { diameter_mm: 44.25 } })).toBe('44.25 mm · 9300 · Automatic')
    const rows = specRows({ movement: { type: 'manual' }, case: { diameter_mm: 38.6, thickness_mm: 9.95 } })
    expect(rows.find(row => row.label === 'Case')?.value).toBe('38.6 mm wide, 9.95 mm thick')
  })

  test('admired watches sort by brand, then title', () => {
    const sorted = [
      { brand: 'Seiko', title: 'Alpinist' },
      { brand: 'Grand Seiko', title: 'Snowflake' },
      { brand: 'Seiko', title: 'Presage' },
      { brand: 'Grand Seiko', title: 'Birch' }
    ].sort(compareAdmired)
    expect(sorted.map(watch => `${watch.brand} ${watch.title}`)).toEqual([
      'Grand Seiko Birch',
      'Grand Seiko Snowflake',
      'Seiko Alpinist',
      'Seiko Presage'
    ])
  })
})
