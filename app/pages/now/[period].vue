<script setup lang="ts">
const route = useRoute()
const period = Array.isArray(route.params.period) ? route.params.period.join('/') : route.params.period

if (!/^\d{4}-\d{2}$/.test(period)) {
  throw createError({
    statusCode: 404,
    statusMessage: 'Now entry not found'
  })
}

const entryPath = `/now/${period}`

const monthFormatter = new Intl.DateTimeFormat('en-SG', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC'
})

const formatMonth = (value: string) => monthFormatter.format(new Date(`${value}T00:00:00.000Z`))

const { data: entry } = await useAsyncData(`now-entry-${period}`, () => {
  return queryCollection('now')
    .path(entryPath)
    .where('draft', '=', false)
    .first()
})

if (!entry.value) {
  throw createError({
    statusCode: 404,
    statusMessage: 'Now entry not found'
  })
}

useSeoMeta({
  title: () => entry.value ? `Now: ${formatMonth(entry.value.date)} | nickczj.com` : 'Now | nickczj.com',
  description: () => entry.value?.summary ?? 'Current focus for nickczj.com.'
})
</script>

<template>
  <article v-if="entry" class="page">
    <NuxtLink class="back-link" to="/now">Back to now</NuxtLink>

    <header class="page-header">
      <p class="eyebrow ornament" aria-hidden="true">
        <svg width="42" height="5" viewBox="0 0 42 5" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0 2.5h16l3-2 3 2h20" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </p>
      <h1>{{ formatMonth(entry.date) }}</h1>
      <p class="lede">{{ entry.summary }}</p>
    </header>

    <ContentRenderer class="prose" :value="entry" />
  </article>
</template>

<style scoped>
h1 {
  font-size: clamp(1.5rem, 3.5vw, 2.2rem);
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
