import { describe, expect, test } from 'bun:test'
import { existsSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { buildSiteMap, lastUpdated, siteMapPages, sitemapXml, type SiteMapNode, type SiteMapSources } from '../shared/site-map'
import { publishedProjects } from '../app/data/projects'

const ROOT = resolve(import.meta.dir, '..')

const writeUp = { value: [['p', {}, 'Notes']] }

const sources: SiteMapSources = {
  posts: [
    { path: '/blog/older', title: 'Older post', date: '2026-03-01' },
    { path: '/blog/draft', title: 'Draft post', date: '2026-12-01', draft: true },
    { path: '/blog/newer', title: 'Newer post', date: '2026-10-01', draft: false }
  ],
  nowEntries: [
    { path: '/now/2026-05', date: '2026-05-01' },
    { path: '/now/2026-11', date: '2026-11-01' },
    { path: '/now/2027-01', date: '2027-01-01', draft: true }
  ],
  pages: [
    { path: '/pages/uses', title: 'Uses', updated: '2026-11-20' },
    { path: '/pages/colophon', title: 'Colophon', updated: '2026-11-27' }
  ],
  projects: [
    { slug: 'homelab', title: 'Homelab', draft: false },
    { slug: 'secret', title: 'Secret', draft: true }
  ],
  watches: [
    { path: '/watches/old', title: 'Old', status: 'owned', acquired: 2019 },
    { path: '/watches/new', title: 'New', status: 'owned', acquired: 2025 },
    { path: '/watches/gone', title: 'Gone', status: 'sold', acquired: 2021 },
    { path: '/watches/default', title: 'Default status' },
    { path: '/watches/wish', title: 'Wish', status: 'admired', body: { value: [] } },
    { path: '/watches/studied', title: 'Studied', status: 'admired', body: writeUp }
  ],
  cvUrl: 'https://cv.example.com'
}

const tree = buildSiteMap(sources)

function findNode(nodes: SiteMapNode[], label: string): SiteMapNode | undefined {
  for (const node of nodes) {
    if (node.label === label) return node
    const match = node.children && findNode(node.children, label)
    if (match) return match
  }
}

function find(nodes: SiteMapNode[], label: string): SiteMapNode {
  const node = findNode(nodes, label)
  if (!node) throw new Error(`no node labelled ${label}`)
  return node
}

const labels = (node: SiteMapNode) => (node.children ?? []).map(child => child.label)

describe('buildSiteMap', () => {
  test('groups the site into four sections', () => {
    expect(tree.map(section => section.label)).toEqual(['Writing', 'Projects', 'Watches', 'About'])
  })

  test('lists published posts newest first, without drafts', () => {
    const blog = find(tree, 'Blog')
    expect(labels(blog)).toEqual(['Newer post', 'Older post'])
    expect(blog.updated).toBe('2026-10-01')
  })

  test('labels now entries by month, newest first, without drafts', () => {
    expect(labels(find(tree, 'Now'))).toEqual(['November 2026', 'May 2026'])
  })

  test('leaves out draft projects', () => {
    const projects = find(tree, 'Projects')
    expect(projects.children).toEqual([{ label: 'Homelab', href: '/projects/homelab' }])
  })

  test('lists the collection newest first and only admired watches with a write-up', () => {
    const watches = find(tree, 'Watches')
    expect(labels(watches)).toEqual(['New', 'Gone', 'Old', 'Default status', 'Admired'])
    expect(labels(find(tree, 'Admired'))).toEqual(['Studied'])
  })

  test('keeps Admired as a page even when no admired watch has a write-up', () => {
    const bare = buildSiteMap({ ...sources, watches: [] })
    expect(find(bare, 'Admired')).toEqual({ label: 'Admired', href: '/watches/admired' })
  })

  test('puts home, the markdown pages and the CV under About', () => {
    expect(labels(find(tree, 'About'))).toEqual(['Home', 'Colophon', 'Uses', 'CV'])
    // Served at /uses, not at its content path /pages/uses.
    expect(find(tree, 'Uses').href).toBe('/uses')
    expect(find(tree, 'CV')).toEqual({ label: 'CV', href: 'https://cv.example.com', external: true })
  })
})

describe('siteMapPages', () => {
  const pages = siteMapPages(tree)

  test('flattens internal pages in tree order and skips external links and headings', () => {
    expect(pages.map(page => page.path)).toEqual([
      '/blog', '/blog/newer', '/blog/older',
      '/now', '/now/2026-11', '/now/2026-05',
      '/projects', '/projects/homelab',
      '/watches', '/watches/new', '/watches/gone', '/watches/old', '/watches/default',
      '/watches/admired', '/watches/studied',
      '/', '/colophon', '/uses'
    ])
  })

  test('carries known dates only', () => {
    expect(pages.find(page => page.path === '/uses')).toEqual({ path: '/uses', updated: '2026-11-20' })
    expect(pages.find(page => page.path === '/projects')).toEqual({ path: '/projects' })
  })

  test('lastUpdated is the newest date in the tree', () => {
    expect(lastUpdated(tree)).toBe('2026-11-27')
    expect(lastUpdated([{ label: 'Home', href: '/' }])).toBeUndefined()
  })
})

describe('sitemapXml', () => {
  test('writes slash-ended locations and lastmod only where known', () => {
    const xml = sitemapXml([{ path: '/' }, { path: '/blog', updated: '2026-10-01' }], 'https://example.com')
    expect(xml).toBe([
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      '  <url>\n    <loc>https://example.com/</loc>\n  </url>',
      '  <url>\n    <loc>https://example.com/blog/</loc>\n    <lastmod>2026-10-01</lastmod>\n  </url>',
      '</urlset>',
      ''
    ].join('\n'))
  })

  test('escapes XML special characters', () => {
    expect(sitemapXml([{ path: '/a&b' }], 'https://example.com')).toContain('<loc>https://example.com/a&amp;b/</loc>')
  })
})

// The site map links straight to these, so each needs a route file.
describe('site map routes exist', () => {
  test('every markdown page in content/pages has a page component', () => {
    const names = readdirSync(join(ROOT, 'content', 'pages')).filter(name => name.endsWith('.md'))
    expect(names.length).toBeGreaterThan(0)
    for (const name of names) {
      expect(existsSync(join(ROOT, 'app', 'pages', name.replace(/\.md$/, '.vue')))).toBe(true)
    }
  })

  test('every published project has a page component', () => {
    for (const project of publishedProjects) {
      expect(existsSync(join(ROOT, 'app', 'pages', 'projects', `${project.slug}.vue`))).toBe(true)
    }
  })
})
