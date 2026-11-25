<script setup lang="ts">
import manifest from '~/data/watch-photos.json'
import { admiredSections, photoCredits, photoSources, type PhotoManifest } from '#shared/watches/format'
import WatchCard from '~/components/watches/WatchCard.vue'
import WatchSection from '~/components/watches/WatchSection.vue'

const { data: watches } = await useAsyncData('watches-admired', () => {
  return queryCollection('watches').where('status', '=', 'admired').all()
})

const sections = computed(() => admiredSections(watches.value ?? []))
const credits = computed(() => photoCredits(watches.value ?? []))

const config = useRuntimeConfig()
const socialImage = computed(() => {
  const lead = sections.value[0]?.items.find(watch => watch.photos?.length)
  const photo = lead?.photos?.[0]
  if (!lead || !photo) return undefined
  const slug = lead.path.split('/').pop() ?? ''
  return photoSources(manifest as PhotoManifest, config.public.mediaBaseUrl, slug, photo.id)?.social
})

const description = 'Watches I admire but don’t own. The shortlist is the ones I plan to buy.'

useSeoMeta({
  title: 'Admired watches | nickczj.com',
  description,
  ogTitle: 'Admired watches | nickczj.com',
  ogDescription: description,
  ogImage: () => socialImage.value,
  twitterCard: () => (socialImage.value ? 'summary_large_image' : 'summary')
})
</script>

<template>
  <section class="page">
    <NuxtLink class="back-link" to="/watches">My watches</NuxtLink>

    <header class="page-header">
      <p class="eyebrow ornament" aria-hidden="true">
        <svg width="42" height="5" viewBox="0 0 42 5" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0 2.5h16l3-2 3 2h20" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </p>
      <h1>Admired</h1>
      <p class="lede">{{ description }}</p>
    </header>

    <template v-if="sections.length">
      <WatchSection
        v-for="section in sections"
        :id="`admired-${section.key}`"
        :key="section.key"
        :title="section.title"
        :count="section.items.length"
      >
        <WatchCard v-for="watch in section.items" :key="watch.path" :watch="watch" />
      </WatchSection>

      <p v-if="credits.length" class="photo-credits">
        Product photos: {{ credits.join(', ') }}. Each card links to the maker's page.
      </p>
    </template>

    <div v-else class="empty-state">
      <p>Nothing listed yet.</p>
    </div>
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

.photo-credits {
  margin: 0;
  padding-top: 1rem;
  border-top: 1px solid var(--rule);
  color: var(--muted);
  font-size: 0.8rem;
}
</style>
