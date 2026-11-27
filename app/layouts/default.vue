<script setup lang="ts">
import { CV_URL, SITE_NAV } from '~/data/site-nav'
</script>

<template>
  <div class="site-shell">
    <header class="site-header">
      <NuxtLink to="/" class="site-brand">nickczj.com</NuxtLink>
      <nav class="site-nav" aria-label="Primary navigation">
        <NuxtLink v-for="item in SITE_NAV" :key="item.to" :to="item.to">{{ item.label }}</NuxtLink>
        <a :href="CV_URL" target="_blank" rel="noopener">CV</a>
      </nav>
      <ThemeToggle />
    </header>

    <main class="site-main">
      <slot />
    </main>

    <footer class="site-footer">
      <NuxtLink to="/colophon">Colophon</NuxtLink>
      <NuxtLink to="/sitemap">Site map</NuxtLink>
    </footer>
  </div>
</template>
