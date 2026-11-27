<script setup lang="ts">
// Starter experiment: your original stars.png, untouched, filling the screen.
// It is served from .design-refs/ by the dev server only, never deployed.
definePageMeta({ layout: false })

useSeoMeta({ title: 'Lab: original stars', robots: 'noindex' })
</script>

<template>
  <main class="stars">
    <img src="/_refs/stars.png" alt="" class="stars-image">
    <NuxtLink to="/lab" class="stars-back">← lab</NuxtLink>
  </main>
</template>

<style scoped>
.stars {
  position: fixed;
  inset: 0;
  background: #04121c;
}

.stars-image {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.stars-back {
  position: absolute;
  top: 1rem;
  left: 1rem;
  color: rgba(255, 255, 255, 0.75);
  font-size: 0.85rem;
  text-decoration: none;
}
</style>
