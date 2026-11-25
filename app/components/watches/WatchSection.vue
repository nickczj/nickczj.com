<script setup lang="ts">
// A titled grid of WatchCards, shared by /watches and /watches/admired.
defineProps<{
  id: string
  title: string
  count: number
}>()
</script>

<template>
  <section class="watch-section" :aria-labelledby="id">
    <h2 :id="id">
      {{ title }}
      <span class="watch-section-count">{{ count }}</span>
    </h2>
    <ul class="watch-grid">
      <slot />
    </ul>
  </section>
</template>

<style scoped>
.watch-section {
  display: grid;
  gap: 1.1rem;
}

.watch-section h2 {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  margin: 0;
  font-size: 1.15rem;
}

.watch-section-count {
  color: var(--muted);
  font-size: 0.85rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.watch-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(13rem, 1fr));
  gap: 1.75rem 1.25rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

@media (max-width: 640px) {
  .watch-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1.25rem 0.85rem;
  }
}
</style>
