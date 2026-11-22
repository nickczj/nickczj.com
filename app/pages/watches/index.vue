<script setup lang="ts">
import manifest from '~/data/watch-photos.json'
import { COLLECTION_STATUSES } from '#shared/watches/schema'
import { collectionStats, compareWatches, photoSources, statusLabel, type PhotoManifest } from '#shared/watches/format'
import WatchCard from '~/components/watches/WatchCard.vue'

const { data: watches } = await useAsyncData('watches', () => {
  return queryCollection('watches').all()
})

const sections = computed(() => {
  const all = watches.value ?? []
  return COLLECTION_STATUSES
    .map(status => ({
      status,
      title: statusLabel(status),
      items: all.filter(watch => (watch.status ?? 'owned') === status).sort(compareWatches)
    }))
    .filter(section => section.items.length)
})

const stats = computed(() => collectionStats(watches.value ?? []))
const admiredCount = computed(() => (watches.value ?? []).filter(watch => watch.status === 'admired').length)

const config = useRuntimeConfig()
const socialImage = computed(() => {
  const lead = sections.value[0]?.items.find(watch => watch.photos?.length)
  const photo = lead?.photos?.[0]
  if (!lead || !photo) return undefined
  const slug = lead.path.split('/').pop() ?? ''
  return photoSources(manifest as PhotoManifest, config.public.mediaBaseUrl, slug, photo.id)?.social
})

const description = 'The watches I own and wear, mostly mechanical: movements, specs, and how well each one keeps time.'

useSeoMeta({
  title: 'Watches | nickczj.com',
  description,
  ogTitle: 'Watches | nickczj.com',
  ogDescription: description,
  ogImage: () => socialImage.value,
  twitterCard: () => (socialImage.value ? 'summary_large_image' : 'summary')
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
      <h1>Watches</h1>
      <p class="lede">{{ description }}</p>
    </header>

    <dl v-if="stats.length" class="watch-stats">
      <div v-for="stat in stats" :key="stat.label" class="watch-stat">
        <dt>{{ stat.label }}</dt>
        <dd>{{ stat.value }}</dd>
      </div>
    </dl>

    <template v-if="sections.length">
      <section
        v-for="section in sections"
        :key="section.status"
        class="watch-section"
        :aria-labelledby="`watches-${section.status}`"
      >
        <h2 :id="`watches-${section.status}`">
          {{ section.title }}
          <span class="watch-section-count">{{ section.items.length }}</span>
        </h2>
        <ul class="watch-grid">
          <WatchCard v-for="watch in section.items" :key="watch.path" :watch="watch" />
        </ul>
      </section>
    </template>

    <div v-else class="empty-state">
      <p>No watches listed yet.</p>
    </div>

    <p v-if="admiredCount" class="watch-elsewhere">
      <NuxtLink to="/watches/admired">Watches I admire</NuxtLink>
      <span>{{ admiredCount }} I don't own but find interesting</span>
    </p>
  </section>
</template>

<style scoped>
h1 {
  font-size: clamp(1.8rem, 5vw, 3rem);
}

.eyebrow.ornament svg {
  stroke-dasharray: 54;
  stroke-dashoffset: 54;
  animation: draw-ornament 0.9s ease-out forwards;
  animation-delay: 0.15s;
}

@keyframes draw-ornament {
  to {
    stroke-dashoffset: 0;
  }
}

.watch-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr));
  gap: 1rem 1.5rem;
  margin: 0;
  padding: 1rem 0;
  border-top: 1px solid var(--rule);
  border-bottom: 1px solid var(--rule);
}

.watch-stat {
  display: grid;
  gap: 0.2rem;
  min-width: 0;
}

.watch-stat dt {
  color: var(--muted);
  font-size: 0.8rem;
}

.watch-stat dd {
  margin: 0;
  color: var(--heading);
  font-size: 1.05rem;
  font-weight: 650;
  font-variant-numeric: tabular-nums;
}

.watch-section {
  display: grid;
  gap: 1.1rem;
}

.watch-section h2 {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  margin: 0;
  font-size: 1.15rem;
}

.watch-section-count {
  color: var(--muted);
  font-size: 0.85rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.watch-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(13rem, 1fr));
  gap: 1.75rem 1.25rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.watch-elsewhere {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.25rem 0.75rem;
  margin: 0;
  padding-top: 1rem;
  border-top: 1px solid var(--rule);
}

.watch-elsewhere a {
  font-weight: 650;
}

.watch-elsewhere a::after {
  content: " →";
}

.watch-elsewhere span {
  color: var(--muted);
  font-size: 0.9rem;
}

@media (max-width: 640px) {
  .watch-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1.25rem 0.85rem;
  }
}
</style>
