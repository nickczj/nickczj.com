<script setup lang="ts">
import manifest from '~/data/watch-photos.json'
import { photoSources, type PhotoManifest } from '#shared/watches/format'

const props = withDefaults(defineProps<{
  slug: string
  id: string
  alt: string
  sizes?: string
  /** Fixed aspect ratio (cropped with object-fit). Omit to use the photo's own. */
  aspect?: string
  eager?: boolean
  /** Wrap in a link to the full-size JPEG. */
  zoom?: boolean
}>(), {
  sizes: '100vw',
  aspect: undefined,
  eager: false,
  zoom: false
})

const config = useRuntimeConfig()
const sources = computed(() =>
  photoSources(manifest as PhotoManifest, config.public.mediaBaseUrl, props.slug, props.id)
)

const frameStyle = computed(() => ({
  aspectRatio: props.aspect ?? (sources.value ? `${sources.value.width} / ${sources.value.height}` : '4 / 5'),
  backgroundColor: sources.value?.color
}))
</script>

<template>
  <a
    v-if="zoom && sources"
    class="watch-photo"
    :class="{ 'is-product': sources.product }"
    :href="sources.full"
    target="_blank"
    rel="noopener"
    :style="frameStyle"
    :aria-label="`${alt} (full size)`"
  >
    <picture>
      <source type="image/avif" :srcset="sources.avif" :sizes="sizes">
      <img
        :src="sources.fallback"
        :srcset="sources.jpg"
        :sizes="sizes"
        :width="sources.width"
        :height="sources.height"
        :alt="alt"
        :loading="eager ? 'eager' : 'lazy'"
        :fetchpriority="eager ? 'high' : undefined"
        decoding="async"
      >
    </picture>
  </a>
  <div v-else class="watch-photo" :class="{ 'is-product': sources?.product }" :style="frameStyle">
    <picture v-if="sources">
      <source type="image/avif" :srcset="sources.avif" :sizes="sizes">
      <img
        :src="sources.fallback"
        :srcset="sources.jpg"
        :sizes="sizes"
        :width="sources.width"
        :height="sources.height"
        :alt="alt"
        :loading="eager ? 'eager' : 'lazy'"
        :fetchpriority="eager ? 'high' : undefined"
        decoding="async"
      >
    </picture>
    <span v-else class="watch-photo-missing">No photo yet</span>
  </div>
</template>

<style scoped>
.watch-photo {
  position: relative;
  display: block;
  overflow: hidden;
  width: 100%;
  border-radius: 8px;
  background: var(--code-bg);
}

.watch-photo picture,
.watch-photo img {
  display: block;
  width: 100%;
  height: 100%;
}

.watch-photo img {
  object-fit: cover;
}

/* Product shots sit on a plain tile whose colour is the frame's background,
   so show them whole; any leftover space blends into the tile. */
.watch-photo.is-product img {
  object-fit: contain;
}

/* Take the glare off white tiles on the dark theme. */
:global([data-theme="dark"]) .watch-photo.is-product {
  filter: brightness(0.9);
}

a.watch-photo:focus-visible {
  outline: 2px solid var(--link);
  outline-offset: 3px;
}

.watch-photo-missing {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  color: var(--muted);
  font-size: 0.85rem;
}
</style>
