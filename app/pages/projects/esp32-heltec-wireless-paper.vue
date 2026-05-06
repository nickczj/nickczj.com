<script setup lang="ts">
import '~/assets/projects.css'
import { getProject } from '~/data/projects'
import StatusBadge from '~/components/projects/StatusBadge.vue'

const project = getProject('esp32-heltec-wireless-paper')

if (!project) {
  throw createError({ statusCode: 404, statusMessage: 'Project not found' })
}

useSeoMeta({
  title: 'ESPHome for Heltec Wireless Paper | nickczj.com',
  description: project.description
})
</script>

<template>
  <article class="page">
    <NuxtLink class="back-link" to="/projects">Back to projects</NuxtLink>

    <header class="page-header">
      <p class="eyebrow">Project</p>
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
        The Heltec Wireless Paper is an ESP32-S3 board with an integrated 2.13" e-ink display,
        designed for low-power wireless sensor nodes and status displays. This project adds
        first-class ESPHome support so the board can be used as a native Home Assistant display.
      </p>

      <h2>Hardware</h2>
      <table class="specs-table">
        <tbody>
          <tr><th>MCU</th><td>ESP32-S3, dual-core Xtensa LX7</td></tr>
          <tr><th>Display</th><td>2.13" e-ink, 250x122, partial refresh</td></tr>
          <tr><th>Wireless</th><td>WiFi 4 + Bluetooth 5 LE</td></tr>
          <tr><th>Battery</th><td>LiPo with onboard charging via USB-C</td></tr>
        </tbody>
      </table>

      <h2>What Works</h2>
      <ul>
        <li>Display driver with partial and full refresh support</li>
        <li>Deep sleep with wake-on-timer for battery operation</li>
        <li>WiFi and BLE coexistence</li>
        <li>Home Assistant sensor and text display components</li>
      </ul>

      <h2>In Progress</h2>
      <ul>
        <li>Button input handling (3 user-facing buttons on board)</li>
        <li>Battery level reporting</li>
        <li>OTA updates over WiFi</li>
      </ul>
    </section>
  </article>
</template>
