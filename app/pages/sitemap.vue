<script setup lang="ts">
import { buildSiteMap, lastUpdated, siteMapPages } from '#shared/site-map'
import { publishedProjects } from '~/data/projects'
import { CV_URL } from '~/data/site-nav'
import SiteMapTree from '~/components/site-map/SiteMapTree.vue'

// The old-school "Site Map": every page on one static screen, grouped, with no
// expanding or collapsing. Built from the content collections, so new posts,
// now entries and watches appear without editing this page. /sitemap.xml
// (server/routes/sitemap.xml.ts) is built from the same tree.
const { data: tree } = await useAsyncData('site-map', async () => {
  const [posts, nowEntries, pages, watches] = await Promise.all([
    queryCollection('blog').select('path', 'title', 'date', 'draft').all(),
    queryCollection('now').select('path', 'date', 'draft').all(),
    queryCollection('pages').select('path', 'title', 'updated').all(),
    queryCollection('watches').select('path', 'title', 'status', 'acquired', 'body').all()
  ])
  // Only the tree goes into the page payload, not the watch write-ups.
  return buildSiteMap({ posts, nowEntries, pages, watches, projects: publishedProjects, cvUrl: CV_URL })
})

const sections = computed(() => tree.value ?? [])
const pageCount = computed(() => siteMapPages(sections.value).length)
const updated = computed(() => lastUpdated(sections.value))

const dateFormatter = new Intl.DateTimeFormat('en-SG', {
  dateStyle: 'medium',
  timeZone: 'UTC'
})

const formatDate = (value: string) => dateFormatter.format(new Date(`${value}T00:00:00.000Z`))

const headingId = (label: string) => `site-map-${label.toLowerCase()}`

useSeoMeta({
  title: 'Site map | nickczj.com',
  description: 'Every page on nickczj.com in one place.'
})
</script>

<template>
  <section class="page">
    <header class="page-header">
      <p class="eyebrow ornament" aria-hidden="true">
        <svg width="42" height="5" viewBox="0 0 42 5" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0 2.5h16l3-2 3 2h20" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </p>
      <h1>Site map</h1>
      <p class="lede">Every page on nickczj.com, in one place.</p>
      <p class="site-map-meta">
        {{ pageCount }} pages<template v-if="updated"> · last updated <time :datetime="updated">{{ formatDate(updated) }}</time></template>
      </p>
    </header>

    <div class="site-map">
      <section
        v-for="section in sections"
        :key="section.label"
        class="site-map-section"
        :aria-labelledby="headingId(section.label)"
      >
        <h2 :id="headingId(section.label)">
          <NuxtLink v-if="section.href" :to="section.href">{{ section.label }}</NuxtLink>
          <template v-else>{{ section.label }}</template>
        </h2>
        <SiteMapTree v-if="section.children?.length" :nodes="section.children" />
      </section>
    </div>
  </section>
</template>

<style scoped>
.site-map-meta {
  margin: 0;
  color: var(--muted);
  font-size: 0.88rem;
}

/* Multi-column, everything visible at once: the layout NN/g found people
   navigated best in their site map studies. */
.site-map {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 12rem), 1fr));
  gap: 2rem 2.5rem;
  align-items: start;
}

.site-map-section h2 {
  margin: 0 0 0.5rem;
  padding-bottom: 0.4rem;
  border-bottom: 1px solid var(--rule);
  font-size: 0.78rem;
  font-weight: 800;
  text-transform: uppercase;
}

.site-map-section h2 a {
  color: inherit;
  text-decoration: none;
}

.site-map-section h2 a:hover {
  color: var(--link);
}
</style>
