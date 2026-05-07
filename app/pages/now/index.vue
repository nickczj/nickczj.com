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
        <p class="eyebrow ornament" aria-hidden="true">
          <svg width="42" height="5" viewBox="0 0 42 5" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 2.5h16l3-2 3 2h20" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </p>
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
