<script setup lang="ts">
const monthFormatter = new Intl.DateTimeFormat('en-SG', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC'
})

const formatMonth = (value: string) => monthFormatter.format(new Date(`${value}T00:00:00.000Z`))

const { data: entries } = await useAsyncData('now-entries', () => {
  return queryCollection('now')
    .where('draft', '=', false)
    .order('date', 'DESC')
    .all()
})

const latest = computed(() => entries.value?.[0] ?? null)
const archive = computed(() => entries.value ?? [])

useSeoMeta({
  title: () => latest.value ? `Now: ${formatMonth(latest.value.date)} | nickczj.com` : 'Now | nickczj.com',
  description: () => latest.value?.summary ?? 'Current focus for nickczj.com.'
})
</script>

<template>
  <section class="page">
    <template v-if="latest">
      <header class="page-header">
        <p class="eyebrow">Now</p>
        <h1>{{ formatMonth(latest.date) }}</h1>
        <p class="lede">{{ latest.summary }}</p>
      </header>

      <ContentRenderer class="prose" :value="latest" />

      <section aria-labelledby="now-archive">
        <h2 id="now-archive">Archive</h2>
        <ul class="archive-list">
          <li v-for="entry in archive" :key="entry.path" class="entry-card">
            <h3>
              <NuxtLink :to="entry.path">{{ formatMonth(entry.date) }}</NuxtLink>
            </h3>
            <p>{{ entry.summary }}</p>
          </li>
        </ul>
      </section>
    </template>

    <div v-else class="empty-state">
      <p>No public now entry yet.</p>
    </div>
  </section>
</template>
