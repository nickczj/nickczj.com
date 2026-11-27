import { compareWatches, hasWriteUp } from './watches/format'
import type { WatchInput } from './watches/schema'

// Every public page on nickczj.com as one tree, built from the content
// collections and the projects list so it never needs hand upkeep. The /sitemap
// page and /sitemap.xml are both built from it, so they cannot drift apart.
// Server code and tests import this file by relative path.

export const SITE_ORIGIN = 'https://nickczj.com'
export const SITE_MAP_PATH = '/sitemap'

export interface SiteMapNode {
  label: string
  /** Internal path such as "/blog", or a full URL when `external`. Group headings have none. */
  href?: string
  external?: boolean
  /** Last change as YYYY-MM-DD, where the content records one. */
  updated?: string
  children?: SiteMapNode[]
}

export interface SiteMapSources {
  posts: { path: string, title: string, date: string, draft?: boolean }[]
  nowEntries: { path: string, date: string, draft?: boolean }[]
  /** The `pages` collection: markdown-backed pages such as /uses and /colophon. */
  pages: { path: string, title: string, updated: string }[]
  projects: { slug: string, title: string, draft: boolean }[]
  watches: (Pick<WatchInput, 'title' | 'status' | 'acquired'> & {
    path: string
    body?: { value?: unknown[] } | null
  })[]
  cvUrl: string
}

const monthFormatter = new Intl.DateTimeFormat('en-SG', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC'
})

function formatMonth(date: string): string {
  return monthFormatter.format(new Date(`${date}T00:00:00.000Z`))
}

function newestFirst(a: { date: string }, b: { date: string }): number {
  return b.date.localeCompare(a.date)
}

/** content/pages/uses.md has the content path /pages/uses but is served at /uses by app/pages/uses.vue. */
function pageRoute(contentPath: string): string {
  return contentPath.replace(/^\/pages(?=\/)/, '')
}

function withChildren(node: SiteMapNode, children: SiteMapNode[]): SiteMapNode {
  return children.length ? { ...node, children } : node
}

export function buildSiteMap(sources: SiteMapSources): SiteMapNode[] {
  const posts = sources.posts.filter(post => !post.draft).sort(newestFirst)
  const nowEntries = sources.nowEntries.filter(entry => !entry.draft).sort(newestFirst)
  const projects = sources.projects.filter(project => !project.draft)
  const pages = [...sources.pages].sort((a, b) => a.title.localeCompare(b.title))

  // Owned and sold watches each have a page. Admired ones get a page only once
  // they have a write-up; the rest are listed on /watches/admired alone.
  const collection = sources.watches
    .filter(watch => (watch.status ?? 'owned') !== 'admired')
    .sort(compareWatches)
  const admired = sources.watches
    .filter(watch => watch.status === 'admired' && hasWriteUp(watch))
    .sort((a, b) => a.title.localeCompare(b.title))

  return [
    {
      label: 'Writing',
      children: [
        withChildren(
          { label: 'Blog', href: '/blog', updated: posts[0]?.date },
          posts.map(post => ({ label: post.title, href: post.path, updated: post.date }))
        ),
        withChildren(
          { label: 'Now', href: '/now', updated: nowEntries[0]?.date },
          nowEntries.map(entry => ({ label: formatMonth(entry.date), href: entry.path, updated: entry.date }))
        )
      ]
    },
    withChildren(
      { label: 'Projects', href: '/projects' },
      projects.map(project => ({ label: project.title, href: `/projects/${project.slug}` }))
    ),
    withChildren({ label: 'Watches', href: '/watches' }, [
      ...collection.map(watch => ({ label: watch.title, href: watch.path })),
      withChildren(
        { label: 'Admired', href: '/watches/admired' },
        admired.map(watch => ({ label: watch.title, href: watch.path }))
      )
    ]),
    {
      label: 'About',
      children: [
        { label: 'Home', href: '/' },
        ...pages.map(page => ({ label: page.title, href: pageRoute(page.path), updated: page.updated })),
        { label: 'CV', href: sources.cvUrl, external: true }
      ]
    }
  ]
}

export interface SiteMapPage {
  path: string
  updated?: string
}

/** Internal pages in tree order, without duplicates or external links. */
export function siteMapPages(tree: SiteMapNode[]): SiteMapPage[] {
  const seen = new Map<string, SiteMapPage>()
  const visit = (nodes: SiteMapNode[]) => {
    for (const node of nodes) {
      if (node.href && !node.external && !seen.has(node.href)) {
        seen.set(node.href, node.updated ? { path: node.href, updated: node.updated } : { path: node.href })
      }
      if (node.children) visit(node.children)
    }
  }
  visit(tree)
  return [...seen.values()]
}

/** The newest `updated` date anywhere in the tree, as YYYY-MM-DD. */
export function lastUpdated(tree: SiteMapNode[]): string | undefined {
  return siteMapPages(tree)
    .map(page => page.updated)
    .filter((date): date is string => Boolean(date))
    .sort()
    .pop()
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * A sitemaps.org 0.9 document. Locations end in a slash: Cloudflare Pages
 * serves prerendered pages from folder index files and answers the slashless
 * URL with a 308, while the server-rendered pages answer both forms with 200.
 */
export function sitemapXml(pages: SiteMapPage[], origin: string = SITE_ORIGIN): string {
  const urls = pages.map((page) => {
    const loc = page.path === '/' ? `${origin}/` : `${origin}${page.path.replace(/\/$/, '')}/`
    const lastmod = page.updated ? `\n    <lastmod>${page.updated}</lastmod>` : ''
    return `  <url>\n    <loc>${escapeXml(loc)}</loc>${lastmod}\n  </url>`
  })
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    '</urlset>',
    ''
  ].join('\n')
}
