<template>
  <div class="site-shell">
    <NuxtRouteAnnouncer />
    <header class="site-header">
      <span class="site-brand">nickczj.com</span>
      <nav class="site-nav" aria-label="Primary navigation">
        <NuxtLink to="/blog">Blog</NuxtLink>
        <NuxtLink to="/now">Now</NuxtLink>
        <NuxtLink to="/uses">Uses</NuxtLink>
        <a href="https://cv.nickczj.com">CV</a>
      </nav>
    </header>

    <main class="site-main">
      <NuxtPage />
    </main>

    <footer class="site-footer">
      <NuxtLink to="/colophon">Colophon</NuxtLink>
    </footer>
  </div>
</template>

<style>
:root {
  color: #1d2320;
  background: #f8f6f0;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-feature-settings: "liga" 1, "calt" 1;
}

body {
  margin: 0;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.78), rgba(248, 246, 240, 0.94)),
    #f8f6f0;
}

a {
  color: #145b63;
  text-decoration-color: rgba(20, 91, 99, 0.35);
  text-underline-offset: 0.22em;
}

a:hover {
  color: #7a4d1d;
  text-decoration-color: rgba(122, 77, 29, 0.55);
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
  color: #26302c;
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
  color: #26302c;
  text-decoration: none;
}

.site-nav a[aria-current="page"],
.site-nav a:hover {
  color: #145b63;
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
  border-top: 1px solid rgba(38, 48, 44, 0.12);
  font-size: 0.85rem;
  color: #6d766f;
}

.site-footer a {
  color: #6d766f;
  text-decoration: none;
}

.site-footer a:hover {
  color: #145b63;
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
  color: #7a4d1d;
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0;
  text-transform: uppercase;
}

h1 {
  margin: 0;
  color: #151916;
  font-size: clamp(2.2rem, 7vw, 4.5rem);
  line-height: 0.96;
  letter-spacing: 0;
}

h2,
h3 {
  color: #151916;
  letter-spacing: 0;
}

p {
  line-height: 1.72;
}

.lede {
  margin: 0;
  color: #46504b;
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
  border-top: 1px solid rgba(38, 48, 44, 0.14);
}

.entry-card h2,
.entry-card h3 {
  margin: 0;
  font-size: 1.25rem;
}

.entry-card p {
  margin: 0;
  color: #46504b;
}

.entry-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
  align-items: center;
  color: #6d766f;
  font-size: 0.88rem;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.tag {
  padding: 0.12rem 0.45rem;
  border: 1px solid rgba(20, 91, 99, 0.18);
  border-radius: 999px;
  color: #145b63;
  font-size: 0.78rem;
}

.empty-state {
  padding: 1.25rem 0;
  border-top: 1px solid rgba(38, 48, 44, 0.14);
  color: #46504b;
}

.prose {
  max-width: 44rem;
  color: #2d342f;
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
