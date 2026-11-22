<script setup lang="ts">
import type { WatchesCollectionItem } from '@nuxt/content'
import { specLine } from '#shared/watches/format'
import WatchPhoto from '~/components/watches/WatchPhoto.vue'

const props = defineProps<{
  watch: WatchesCollectionItem
}>()

const slug = computed(() => props.watch.path.split('/').pop() ?? '')
const hero = computed(() => props.watch.photos?.[0])
</script>

<template>
  <li class="watch-card">
    <NuxtLink :to="watch.path" class="watch-card-link">
      <WatchPhoto
        :slug="slug"
        :id="hero?.id ?? ''"
        :alt="hero?.alt ?? ''"
        aspect="4 / 5"
        sizes="(max-width: 640px) 50vw, 18rem"
      />
      <span class="watch-card-text">
        <span class="watch-card-brand">{{ watch.brand }}</span>
        <span class="watch-card-title">{{ watch.title }}</span>
        <span class="watch-card-spec">{{ specLine(watch) }}</span>
      </span>
    </NuxtLink>
  </li>
</template>

<style scoped>
.watch-card {
  min-width: 0;
}

.watch-card-link {
  display: grid;
  gap: 0.7rem;
  color: inherit;
  text-decoration: none;
}

.watch-card-link:focus-visible {
  outline: 2px solid var(--link);
  outline-offset: 4px;
  border-radius: 8px;
}

.watch-card-link :deep(.watch-photo img) {
  transition: transform 0.35s ease;
}

.watch-card-link:hover :deep(.watch-photo img) {
  transform: scale(1.025);
}

.watch-card-text {
  display: grid;
  gap: 0.15rem;
}

.watch-card-brand {
  color: var(--eyebrow);
  font-size: 0.72rem;
  font-weight: 800;
  text-transform: uppercase;
}

.watch-card-title {
  color: var(--heading);
  font-size: 1.02rem;
  font-weight: 700;
  line-height: 1.3;
}

.watch-card-link:hover .watch-card-title {
  color: var(--link);
}

.watch-card-spec {
  color: var(--muted);
  font-size: 0.84rem;
  line-height: 1.45;
}

@media (prefers-reduced-motion: reduce) {
  .watch-card-link :deep(.watch-photo img) {
    transition: none;
  }

  .watch-card-link:hover :deep(.watch-photo img) {
    transform: none;
  }
}
</style>
