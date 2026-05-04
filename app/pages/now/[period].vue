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
      <p class="eyebrow">Now</p>
      <h1>{{ formatMonth(entry.date) }}</h1>
      <p class="lede">{{ entry.summary }}</p>
    </header>

    <ContentRenderer class="prose" :value="entry" />
  </article>
</template>
