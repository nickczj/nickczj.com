import { describe, expect, test } from 'bun:test'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { SLUG_PATTERN, watchFrontmatterSchema } from '../shared/watches/schema'
import type { PhotoManifest } from '../shared/watches/format'

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

        test('every listed photo has been processed', () => {
          const parsed = watchFrontmatterSchema.safeParse(data)
          if (!parsed.success) return
          const missing = parsed.data.photos.filter(photo => !manifest[slug]?.[photo.id]).map(photo => photo.id)
          if (missing.length) {
            throw new Error(`run \`bun run watches:photos ${slug} <files>\` for: ${missing.join(', ')}`)
          }
        })

        test('has a body', () => {
          expect(body.trim().length).toBeGreaterThan(0)
        })
      }
    })
  }
})
