<script setup lang="ts">
import manifest from '~/data/watch-photos.json'
import { formatRate, hasWriteUp, isMechanical, photoSources, specRows, type PhotoManifest } from '#shared/watches/format'
import WatchPhoto from '~/components/watches/WatchPhoto.vue'
import AccuracyChart from '~/components/watches/AccuracyChart.vue'

const route = useRoute()
const slug = String(route.params.slug)
const watchPath = `/watches/${slug}`

const { data: watch } = await useAsyncData(`watch-${slug}`, () => {
  return queryCollection('watches').path(watchPath).first()
})

// Admired watches without a write-up are listed on /watches/admired only.
if (!watch.value || (watch.value.status === 'admired' && !hasWriteUp(watch.value))) {
  throw createError({
    statusCode: 404,
    statusMessage: 'Watch not found'
  })
}

const admired = computed(() => watch.value?.status === 'admired')

const photos = computed(() => watch.value?.photos ?? [])
const hero = computed(() => photos.value[0])
const gallery = computed(() => photos.value.slice(1))
// Under a credited maker's photo, label the rest so they aren't read as the maker's too.
const ownGallery = computed(() => Boolean(hero.value?.credit) && gallery.value.length > 0 && gallery.value.every(photo => !photo.credit))
const specs = computed(() => (watch.value ? specRows(watch.value) : []))
const readings = computed(() => watch.value?.accuracy ?? [])
const mechanical = computed(() => (watch.value ? isMechanical(watch.value.movement.type) : false))
const latestReading = computed(() => [...readings.value].sort((a, b) => a.date.localeCompare(b.date)).pop())

const meta = computed(() => {
  if (!watch.value) return []
  const parts: string[] = []
  if (watch.value.nickname) parts.push(`“${watch.value.nickname}”`)
  if (watch.value.status === 'owned' && watch.value.acquired) parts.push(`Since ${watch.value.acquired}`)
  if (watch.value.status === 'sold') parts.push(watch.value.acquired ? `Owned from ${watch.value.acquired}` : 'Previously owned')
  if (watch.value.status === 'admired') parts.push(watch.value.shortlist ? 'On my shortlist' : 'Admired, not owned')
  return parts
})

const config = useRuntimeConfig()
const socialImage = computed(() => {
  if (!hero.value) return undefined
  return photoSources(manifest as PhotoManifest, config.public.mediaBaseUrl, slug, hero.value.id)?.social
})

useSeoMeta({
  title: () => (watch.value ? `${watch.value.title} | Watches | nickczj.com` : 'Watches | nickczj.com'),
  description: () => watch.value?.description ?? '',
  ogTitle: () => watch.value?.title ?? 'Watches',
  ogDescription: () => watch.value?.description ?? '',
  ogType: 'article',
  ogImage: () => socialImage.value,
  ogImageAlt: () => hero.value?.alt,
  twitterCard: () => (socialImage.value ? 'summary_large_image' : 'summary')
})
</script>

<template>
  <article v-if="watch" class="page watch">
    <NuxtLink v-if="admired" class="back-link" to="/watches/admired">All admired watches</NuxtLink>
    <NuxtLink v-else class="back-link" to="/watches">All watches</NuxtLink>

    <header class="page-header">
      <p class="eyebrow">{{ watch.brand }}</p>
      <h1>{{ watch.title }}</h1>
      <p class="lede">{{ watch.description }}</p>
      <div v-if="meta.length || watch.tags?.length || watch.link" class="entry-meta">
        <span v-for="part in meta" :key="part">{{ part }}</span>
        <span v-if="watch.tags?.length" class="tag-list" aria-label="Tags">
          <span v-for="tag in watch.tags" :key="tag" class="tag">{{ tag }}</span>
        </span>
        <a v-if="watch.link" :href="watch.link" target="_blank" rel="noopener">
          Official page<span aria-hidden="true"> ↗</span>
        </a>
      </div>
    </header>

    <section v-if="hero" class="watch-gallery" aria-label="Photos">
      <WatchPhoto
        class="watch-hero"
        :slug="slug"
        :id="hero.id"
        :alt="hero.alt"
        sizes="(max-width: 896px) calc(100vw - 2rem), 56rem"
        eager
        zoom
      />
      <p v-if="hero.credit" class="photo-credit">
        Photo:
        <a v-if="hero.source" :href="hero.source" target="_blank" rel="noopener">{{ hero.credit }}</a>
        <template v-else>{{ hero.credit }}</template>
      </p>
      <p v-if="ownGallery" class="watch-gallery-label">My photos</p>
      <div v-if="gallery.length" class="watch-thumbs">
        <WatchPhoto
          v-for="photo in gallery"
          :key="photo.id"
          :slug="slug"
          :id="photo.id"
          :alt="photo.alt"
          aspect="1 / 1"
          sizes="(max-width: 640px) 50vw, 18rem"
          zoom
        />
      </div>
    </section>

    <div class="watch-details">
      <section v-if="specs.length" class="watch-specs" aria-labelledby="watch-specs">
        <h2 id="watch-specs">Specs</h2>
        <dl>
          <div v-for="row in specs" :key="row.label" class="watch-spec-row">
            <dt>{{ row.label }}</dt>
            <dd>{{ row.value }}</dd>
          </div>
        </dl>
      </section>

      <section v-if="readings.length && latestReading" class="watch-accuracy" aria-labelledby="watch-accuracy">
        <h2 id="watch-accuracy">Accuracy</h2>
        <p class="watch-accuracy-figure">
          <span class="watch-accuracy-value">{{ formatRate(latestReading.seconds_per_day) }}</span>
          <span class="watch-accuracy-context">latest reading</span>
        </p>
        <AccuracyChart
          :readings="readings"
          :band="mechanical ? [-4, 6] : null"
          :band-label="mechanical ? 'COSC chronometer range, −4 to +6 s/day' : ''"
        />
      </section>
    </div>

    <ContentRenderer class="prose" :value="watch" />
  </article>
</template>

<style scoped>
h1 {
  font-size: clamp(1.7rem, 4.5vw, 2.6rem);
  line-height: 1.05;
}

/* Keep wide children (the chart before it measures itself) from widening the page. */
.watch {
  grid-template-columns: minmax(0, 1fr);
}

.watch-specs,
.watch-accuracy {
  min-width: 0;
}

.watch-gallery {
  display: grid;
  gap: 0.75rem;
}

.watch-hero {
  max-height: 80vh;
}

/* Tall shots letterbox on their own dominant colour instead of being cropped. */
.watch-hero :deep(img) {
  object-fit: contain;
}

/* A maker's tile is already 4:5 and padded, so it needs no letterboxing; keep
   it to a sensible size instead of the full column. */
.watch-hero.is-product {
  width: min(100%, 30rem);
  max-height: none;
}

.photo-credit {
  margin: -0.35rem 0 0;
  color: var(--muted);
  font-size: 0.8rem;
}

.watch-gallery-label {
  margin: 0.75rem 0 0;
  color: var(--heading);
  font-size: 0.92rem;
  font-weight: 650;
}

.watch-thumbs {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(11rem, 1fr));
  gap: 0.75rem;
}

@media (max-width: 640px) {
  .watch-thumbs {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.watch-details {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 2rem 2.5rem;
  align-items: start;
}

.watch-details h2 {
  margin: 0 0 0.75rem;
  font-size: 1.15rem;
}

.watch-specs dl {
  display: grid;
  margin: 0;
}

.watch-spec-row {
  display: grid;
  grid-template-columns: 9.5rem minmax(0, 1fr);
  gap: 1rem;
  padding: 0.5rem 0;
  border-top: 1px solid var(--rule);
  font-size: 0.92rem;
}

.watch-spec-row dt {
  color: var(--muted);
}

.watch-spec-row dd {
  margin: 0;
  color: var(--prose);
  font-variant-numeric: tabular-nums;
}

.watch-accuracy {
  display: grid;
  gap: 0.5rem;
}

.watch-accuracy-figure {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  margin: 0;
  line-height: 1.2;
}

.watch-accuracy-value {
  color: var(--heading);
  font-size: 1.6rem;
  font-weight: 650;
  font-variant-numeric: tabular-nums;
}

.watch-accuracy-context {
  color: var(--muted);
  font-size: 0.85rem;
}

@media (max-width: 760px) {
  .watch-details {
    grid-template-columns: minmax(0, 1fr);
  }

  .watch-spec-row {
    grid-template-columns: 8rem minmax(0, 1fr);
  }
}
</style>
