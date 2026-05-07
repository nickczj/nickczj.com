<script setup lang="ts">
const dateFormatter = new Intl.DateTimeFormat('en-SG', {
  dateStyle: 'medium',
  timeZone: 'UTC'
})

const formatDate = (value: string) => dateFormatter.format(new Date(`${value}T00:00:00.000Z`))

const { data: entry } = await useAsyncData('page-colophon', () => {
  return queryCollection('pages').path('/pages/colophon').first()
})

if (!entry.value) {
  throw createError({
    statusCode: 404,
    statusMessage: 'Page not found'
  })
}

useSeoMeta({
  title: () => entry.value ? `${entry.value.title} | nickczj.com` : 'Colophon | nickczj.com',
  description: () => entry.value?.description ?? 'How nickczj.com is built.'
})
</script>

<template>
  <article v-if="entry" class="page">
    <header class="page-header">
      <p class="eyebrow ornament" aria-hidden="true">
        <svg width="42" height="5" viewBox="0 0 42 5" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0 2.5h16l3-2 3 2h20" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </p>
      <h1>{{ entry.title }}</h1>
      <p class="lede">{{ entry.description }}</p>
      <p class="entry-meta">
        <span>Updated <time :datetime="entry.updated">{{ formatDate(entry.updated) }}</time></span>
      </p>
    </header>

    <ContentRenderer class="prose" :value="entry" />
  </article>
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
</style>
