<script setup lang="ts">
import type { WatchesCollectionItem } from '@nuxt/content'
import { hasWriteUp, specLine } from '#shared/watches/format'
import WatchPhoto from '~/components/watches/WatchPhoto.vue'

const props = defineProps<{
  watch: WatchesCollectionItem
}>()

const slug = computed(() => props.watch.path.split('/').pop() ?? '')
const photo = computed(() => props.watch.photos?.[0])
// A write-up gets its own page; otherwise the title goes to the brand's page.
const detail = computed(() => hasWriteUp(props.watch))
</script>

<template>
  <li class="entry-card admired-watch" :class="{ 'has-photo': photo }">
    <div class="admired-watch-text">
      <div class="entry-meta">
        <span class="admired-watch-brand">{{ watch.brand }}</span>
        <span>{{ specLine(watch) }}</span>
      </div>
      <h2>
        <NuxtLink v-if="detail" :to="watch.path">{{ watch.title }}</NuxtLink>
        <a v-else-if="watch.link" :href="watch.link" target="_blank" rel="noopener">
          {{ watch.title }}<span class="external" aria-hidden="true"> ↗</span>
        </a>
        <template v-else>{{ watch.title }}</template>
      </h2>
      <p>{{ watch.description }}</p>
      <div v-if="watch.tags?.length || (detail && watch.link) || photo?.credit" class="entry-meta">
        <span v-if="watch.tags?.length" class="tag-list" aria-label="Tags">
          <span v-for="tag in watch.tags" :key="tag" class="tag">{{ tag }}</span>
        </span>
        <a v-if="detail && watch.link" :href="watch.link" target="_blank" rel="noopener">
          Official page<span class="external" aria-hidden="true"> ↗</span>
        </a>
        <span v-if="photo?.credit" class="admired-watch-credit">Photo: {{ photo.credit }}</span>
      </div>
    </div>
    <WatchPhoto
      v-if="photo"
      class="admired-watch-photo"
      :slug="slug"
      :id="photo.id"
      :alt="photo.alt"
      aspect="4 / 5"
      sizes="7rem"
    />
  </li>
</template>

<style scoped>
.admired-watch.has-photo {
  grid-template-columns: minmax(0, 1fr) 7rem;
  gap: 1.25rem;
  align-items: start;
}

.admired-watch-text {
  display: grid;
  gap: 0.6rem;
  min-width: 0;
}

.admired-watch-brand {
  color: var(--eyebrow);
  font-size: 0.72rem;
  font-weight: 800;
  text-transform: uppercase;
}

.admired-watch-credit {
  font-size: 0.8rem;
}

.admired-watch h2 {
  font-size: 1.15rem;
}

.admired-watch-photo {
  border-radius: 6px;
  overflow: hidden;
}

@media (max-width: 640px) {
  .admired-watch.has-photo {
    grid-template-columns: minmax(0, 1fr) 5rem;
    gap: 0.9rem;
  }
}
</style>
