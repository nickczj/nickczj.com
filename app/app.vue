<script setup lang="ts">
const route = useRoute()
const isHome = computed(() => route.path === '/')

const { init, listen } = useTheme()
onMounted(() => {
  init()
  listen()
})
</script>

<template>
  <div :class="isHome ? 'home-shell-wrapper' : 'site-shell'">
    <NuxtRouteAnnouncer />
    <template v-if="!isHome">
      <header class="site-header">
        <NuxtLink to="/" class="site-brand">nickczj.com</NuxtLink>
        <nav class="site-nav" aria-label="Primary navigation">
          <NuxtLink to="/blog">Blog</NuxtLink>
          <NuxtLink to="/projects">Projects</NuxtLink>
          <NuxtLink to="/now">Now</NuxtLink>
          <NuxtLink to="/uses">Uses</NuxtLink>
          <a href="https://cv.nickczj.com">CV</a>
        </nav>
        <ThemeToggle />
      </header>

      <main class="site-main">
        <NuxtPage />
      </main>

      <footer class="site-footer">
        <NuxtLink to="/colophon">Colophon</NuxtLink>
      </footer>
    </template>

    <NuxtPage v-else />
  </div>
</template>

<style>
:root {
  --text: #1d2320;
  --bg: #f8f6f0;
  --bg-gradient: linear-gradient(180deg, rgba(255, 255, 255, 0.78), rgba(248, 246, 240, 0.94)), #f8f6f0;
  --link: #145b63;
  --link-underline: rgba(20, 91, 99, 0.35);
  --link-hover: #7a4d1d;
  --link-hover-underline: rgba(122, 77, 29, 0.55);
  --brand: #26302c;
  --heading: #151916;
  --lede: #46504b;
  --prose: #2d342f;
  --muted: #6d766f;
  --eyebrow: #7a4d1d;
  --rule: rgba(38, 48, 44, 0.14);
  --rule-footer: rgba(38, 48, 44, 0.12);
  --tag-border: rgba(20, 91, 99, 0.18);

  color-scheme: light;
  color: var(--text);
  background: var(--bg);
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-feature-settings: "liga" 1, "calt" 1;
}

[data-theme="dark"] {
  --text: #d6dbd4;
  --bg: #1a1d1b;
  --bg-gradient: linear-gradient(180deg, rgba(0, 0, 0, 0.35), rgba(26, 29, 27, 0.98)), #1a1d1b;
  --link: #58b9c2;
  --link-underline: rgba(88, 185, 194, 0.35);
  --link-hover: #d4945a;
  --link-hover-underline: rgba(212, 148, 90, 0.55);
  --brand: #b0bcb0;
  --heading: #e8ede5;
  --lede: #b0b8b0;
  --prose: #d0d6cf;
  --muted: #8a948b;
  --eyebrow: #d4945a;
  --rule: rgba(255, 255, 255, 0.08);
  --rule-footer: rgba(255, 255, 255, 0.08);
  --tag-border: rgba(88, 185, 194, 0.25);

  color-scheme: dark;
}

:root.theme-transitioning,
:root.theme-transitioning *,
:root.theme-transitioning *::before,
:root.theme-transitioning *::after {
  transition: background-color 0.3s ease, border-color 0.3s ease,
              color 0.3s ease, box-shadow 0.3s ease !important;
}

body {
  margin: 0;
  background: var(--bg-gradient);
}

a {
  color: var(--link);
  text-decoration-color: var(--link-underline);
  text-underline-offset: 0.22em;
}

a:hover {
  color: var(--link-hover);
  text-decoration-color: var(--link-hover-underline);
}

.site-shell {
  min-height: 100vh;
}

.site-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  width: min(100% - 2rem, 56rem);
  margin: 0 auto;
  padding: 1.25rem 0;
}

.site-brand {
  color: var(--brand);
  font-size: 0.95rem;
  font-weight: 700;
}

.site-nav {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  font-size: 0.92rem;
  font-weight: 650;
}

.site-nav a {
  color: var(--brand);
  text-decoration: none;
}

.site-nav a[aria-current="page"],
.site-nav a:hover {
  color: var(--link);
}

.site-main {
  width: min(100% - 2rem, 56rem);
  margin: 0 auto;
  padding: 3rem 0 5rem;
}

.site-footer {
  width: min(100% - 2rem, 56rem);
  margin: 0 auto;
  padding: 1.5rem 0 2.5rem;
  border-top: 1px solid var(--rule-footer);
  font-size: 0.85rem;
  color: var(--muted);
}

.site-footer a {
  color: var(--muted);
  text-decoration: none;
}

.site-footer a:hover {
  color: var(--link);
}

.page {
  display: grid;
  gap: 2rem;
}

.page-header {
  display: grid;
  gap: 0.7rem;
  max-width: 42rem;
}

.eyebrow {
  margin: 0;
  color: var(--eyebrow);
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0;
  text-transform: uppercase;
}

h1 {
  margin: 0;
  color: var(--heading);
  font-size: clamp(2.2rem, 7vw, 4.5rem);
  line-height: 0.96;
  letter-spacing: 0;
}

h2,
h3 {
  color: var(--heading);
  letter-spacing: 0;
}

p {
  line-height: 1.72;
}

.lede {
  margin: 0;
  color: var(--lede);
  font-size: 1.1rem;
  line-height: 1.65;
}

.entry-list,
.archive-list {
  display: grid;
  gap: 1rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.entry-card {
  display: grid;
  gap: 0.75rem;
  padding: 1rem 0;
  border-top: 1px solid var(--rule);
}

.entry-card h2,
.entry-card h3 {
  margin: 0;
  font-size: 1.25rem;
}

.entry-card p {
  margin: 0;
  color: var(--lede);
}

.entry-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
  align-items: center;
  color: var(--muted);
  font-size: 0.88rem;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.tag {
  padding: 0.12rem 0.45rem;
  border: 1px solid var(--tag-border);
  border-radius: 999px;
  color: var(--link);
  font-size: 0.78rem;
}

.empty-state {
  padding: 1.25rem 0;
  border-top: 1px solid var(--rule);
  color: var(--lede);
}

.prose {
  max-width: 44rem;
  color: var(--prose);
}

.prose :where(h1, h2, h3) {
  margin-top: 2rem;
  margin-bottom: 0.75rem;
}

.prose :where(p, ul, ol) {
  margin-top: 0;
  margin-bottom: 1.1rem;
}

.prose :where(li) {
  margin-bottom: 0.35rem;
  line-height: 1.7;
}

.back-link {
  font-size: 0.92rem;
  font-weight: 650;
}

@media (max-width: 640px) {
  .site-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .site-main {
    padding-top: 2rem;
  }

  h1 {
    font-size: clamp(2.15rem, 14vw, 3.25rem);
  }
}
</style>
