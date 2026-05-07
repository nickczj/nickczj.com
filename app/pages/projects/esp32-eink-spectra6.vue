<script setup lang="ts">
import '~/assets/projects.css'
import { getProject } from '~/data/projects'
import StatusBadge from '~/components/projects/StatusBadge.vue'

const project = getProject('esp32-eink-spectra6')

if (!project) {
  throw createError({ statusCode: 404, statusMessage: 'Project not found' })
}

useSeoMeta({
  title: 'DIY E-Ink Dashboard with Spectra 6 | nickczj.com',
  description: project.description
})
</script>

<template>
  <article class="page">
    <NuxtLink class="back-link" to="/projects">Back to projects</NuxtLink>

    <header class="page-header">
      <p class="eyebrow ornament" aria-hidden="true">
        <svg width="42" height="5" viewBox="0 0 42 5" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0 2.5h16l3-2 3 2h20" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </p>
      <h1>{{ project.title }}</h1>
      <div class="entry-meta">
        <StatusBadge :status="project.status" />
        <span v-if="project.techs.length" class="tag-list" aria-label="Tech stack">
          <span v-for="tech in project.techs" :key="tech" class="tag">{{ tech }}</span>
        </span>
      </div>
      <p class="lede">{{ project.description }}</p>
      <div v-if="project.repo || project.live" class="project-links">
        <a v-if="project.repo" :href="project.repo" target="_blank" rel="noopener">Source</a>
        <a v-if="project.live" :href="project.live" target="_blank" rel="noopener">Live</a>
      </div>
    </header>

    <img
      v-if="project.image"
      :src="project.image"
      :alt="project.title"
      class="project-hero"
    />

    <section class="prose">
      <h2>Overview</h2>
      <p>
        A custom e-ink information display built from scratch using a Waveshare Spectra 6
        panel and ESP32. Designed as a low-power always-on dashboard showing weather, calendar,
        homelab status, and public transport times — refreshing once every 15 minutes and
        running for months on a single battery charge.
      </p>

      <h2>Why Spectra 6?</h2>
      <p>
        Spectra 6 (also marketed as E6) is Waveshare's implementation of the ACeP
        (Advanced Color ePaper) technology. Unlike traditional black-and-white e-ink or the
        older black-white-red Spectra 3 panels, Spectra 6 supports 6 colors: black, white,
        red, yellow, blue, and green. Full refresh takes about 15 seconds — slow, but
        perfect for a dashboard that updates infrequently.
      </p>

      <h2>Hardware</h2>
      <table class="specs-table">
        <tbody>
          <tr><th>Display</th><td>Waveshare 7.3" Spectra 6, 800x480, 6-color ACeP</td></tr>
          <tr><th>Driver Board</th><td>Waveshare ESP32-S3 e-paper driver</td></tr>
          <tr><th>Enclosure</th><td>3D-printed PLA with matte finish</td></tr>
          <tr><th>Power</th><td>18650 Li-ion cell, ~3 months per charge</td></tr>
        </tbody>
      </table>

      <h2>Design Decisions</h2>
      <ul>
        <li><strong>Push, not pull</strong> — the display fetches from a lightweight API endpoint serving pre-rendered bitmap data, rather than rendering on-device. This keeps the ESP32 firmware simple and the layout easy to iterate.</li>
        <li><strong>Custom bitmap format</strong> — a compact indexed bitmap maps each 2-bit pixel to one of 6 colors, reducing payload to ~240 KB per frame.</li>
        <li><strong>Deep sleep between refreshes</strong> — the ESP32 wakes every 15 minutes, fetches the latest frame over WiFi, pushes it to the panel, and goes back to sleep. Average power draw is under 1 mW.</li>
      </ul>

      <h2>Current Status</h2>
      <p>
        Prototype hardware is assembled and the display driver is working. The bitmap
        rendering server (a small Bun endpoint) serves pre-composed dashboard frames.
        Next steps: design the dashboard layout, add weather and calendar data sources,
        and refine the 3D-printed enclosure.
      </p>
    </section>
  </article>
</template>

<style scoped>
h1 {
  font-size: clamp(1.5rem, 3.5vw, 2.2rem);
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
