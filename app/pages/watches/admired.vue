<script setup lang="ts">
import { compareAdmired } from '#shared/watches/format'
import AdmiredWatch from '~/components/watches/AdmiredWatch.vue'

const { data: watches } = await useAsyncData('watches-admired', () => {
  return queryCollection('watches').where('status', '=', 'admired').all()
})

const admired = computed(() => [...(watches.value ?? [])].sort(compareAdmired))

const description = 'Watches I admire but don’t own: designs, movements, and stories I find interesting. Not a shopping list.'

useSeoMeta({
  title: 'Admired watches | nickczj.com',
  description,
  ogTitle: 'Admired watches | nickczj.com',
  ogDescription: description,
  twitterCard: 'summary'
})
</script>

<template>
  <section class="page">
    <NuxtLink class="back-link" to="/watches">My watches</NuxtLink>

    <header class="page-header">
      <p class="eyebrow ornament" aria-hidden="true">
        <svg width="42" height="5" viewBox="0 0 42 5" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0 2.5h16l3-2 3 2h20" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </p>
      <h1>Admired</h1>
      <p class="lede">{{ description }}</p>
    </header>

    <ul v-if="admired.length" class="entry-list">
      <AdmiredWatch v-for="watch in admired" :key="watch.path" :watch="watch" />
    </ul>

    <div v-else class="empty-state">
      <p>Nothing listed yet.</p>
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
