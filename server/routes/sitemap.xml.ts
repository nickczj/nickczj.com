import { defineEventHandler, setHeader } from 'h3'
import { queryCollection } from '@nuxt/content/nitro'
import { SITE_MAP_PATH, buildSiteMap, siteMapPages, sitemapXml } from '../../shared/site-map'
import { publishedProjects } from '../../app/data/projects'
import { CV_URL } from '../../app/data/site-nav'

// sitemap.xml for search engines, built from the same tree as the /sitemap
// page (app/pages/sitemap.vue). Prerendered at build time, see nuxt.config.ts.
export default defineEventHandler(async (event) => {
  const [posts, nowEntries, pages, watches] = await Promise.all([
    queryCollection(event, 'blog').select('path', 'title', 'date', 'draft').all(),
    queryCollection(event, 'now').select('path', 'date', 'draft').all(),
    queryCollection(event, 'pages').select('path', 'title', 'updated').all(),
    queryCollection(event, 'watches').select('path', 'title', 'status', 'acquired', 'body').all()
  ])
  const tree = buildSiteMap({ posts, nowEntries, pages, watches, projects: publishedProjects, cvUrl: CV_URL })

  setHeader(event, 'Content-Type', 'application/xml; charset=utf-8')
  return sitemapXml([...siteMapPages(tree), { path: SITE_MAP_PATH }])
})
