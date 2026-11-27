<script setup lang="ts">
import { CV_URL, SITE_NAV } from '~/data/site-nav'

// A blank slate on purpose. Try homepage ideas under app/pages/lab/ (dev
// only, see /lab), then bring the one that sticks here. The old dashboard
// lives on at /projects/homelab.
definePageMeta({ layout: false })

// The homepage leaves Watches out; the site header still links it.
const homeNav = SITE_NAV.filter(item => item.to !== '/watches')

useSeoMeta({
  title: 'nick chow — nickczj.com',
  description: 'senior software engineer in singapore. backend-leaning full-stack, homelab tinkerer, sg-finance hobbyist.'
})
</script>

<template>
  <main class="home">
    <h1>Nick Chow</h1>
    <img src="/stars.webp" alt="" width="1280" height="1138" class="home-stars">
    <nav class="home-nav" aria-label="Primary navigation">
      <NuxtLink v-for="item in homeNav" :key="item.to" :to="item.to">{{ item.label }}</NuxtLink>
      <a :href="CV_URL" target="_blank" rel="noopener">CV</a>
      <ThemeToggle />
    </nav>
  </main>
</template>

<style scoped>
.home {
  display: grid;
  align-content: center;
  gap: 1.25rem;
  box-sizing: border-box;
  width: min(100% - 2rem, 40rem);
  min-height: 100svh;
  margin: 0 auto;
  padding: 3rem 0;
}

.home-stars {
  display: block;
  width: 100%;
  height: auto;
}

.home-nav {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem 1rem;
  font-weight: 650;
}
</style>
