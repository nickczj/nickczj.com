<script setup lang="ts">
const dateFormatter = new Intl.DateTimeFormat('en-SG', {
  dateStyle: 'medium',
  timeZone: 'UTC'
})

const formatDate = (value: string) => dateFormatter.format(new Date(`${value}T00:00:00.000Z`))

const { data: entry } = await useAsyncData('page-uses', () => {
  return queryCollection('pages').path('/pages/uses').first()
})

if (!entry.value) {
  throw createError({
    statusCode: 404,
    statusMessage: 'Page not found'
  })
}

useSeoMeta({
  title: () => entry.value ? `${entry.value.title} | nickczj.com` : 'Uses | nickczj.com',
  description: () => entry.value?.description ?? 'Hardware and software I use day to day.'
})
</script>

<template>
  <article v-if="entry" class="page">
    <header class="page-header">
      <p class="eyebrow">Setup</p>
      <h1>{{ entry.title }}</h1>
      <p class="lede">{{ entry.description }}</p>
      <p class="entry-meta">
        <span>Updated <time :datetime="entry.updated">{{ formatDate(entry.updated) }}</time></span>
      </p>
    </header>

    <ContentRenderer class="prose" :value="entry" />
  </article>
</template>
