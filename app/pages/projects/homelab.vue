<script setup lang="ts">
import '~/assets/projects.css'
import { getProject } from '~/data/projects'
import StatusBadge from '~/components/projects/StatusBadge.vue'
import HomelabMetrics from '~/components/projects/HomelabMetrics.vue'
import HomelabServices from '~/components/projects/HomelabServices.vue'

const project = getProject('homelab')

if (!project) {
  throw createError({ statusCode: 404, statusMessage: 'Project not found' })
}

useSeoMeta({
  title: 'Homelab | nickczj.com',
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

    <HomelabMetrics />

    <HomelabServices />

    <section class="prose">
      <h2>Hardware</h2>
      <table class="specs-table">
        <tbody>
          <tr><th>Board</th><td>Raspberry Pi 5, 8 GB RAM</td></tr>
          <tr><th>Storage</th><td>256 GB NVMe SSD (USB 3.0 enclosure)</td></tr>
          <tr><th>Power</th><td>Official 27W USB-C PSU</td></tr>
          <tr><th>OS</th><td>Ubuntu Server 24.04 LTS (arm64)</td></tr>
          <tr><th>Network</th><td>Gigabit Ethernet + Tailscale mesh VPN</td></tr>
        </tbody>
      </table>

      <h2>Architecture</h2>
      <p>
        The homelab runs Docker with Traefik as the reverse proxy, providing automatic TLS via Let's Encrypt
        and routing to internal services. Pi-hole handles DNS-level ad blocking for all devices on the network.
        Homebridge bridges smart home accessories into Apple HomeKit. Tailscale provides secure remote access
        without exposing services to the public internet.
      </p>
      <p>
        The status data you see above is collected every 2 minutes by Bun pushers on normal Linux nodes
        and a Rust add-on on Home Assistant Yellow, pushed to a Cloudflare D1 database, and served through
        a Cloudflare Pages Function with edge caching. This page polls that same API every 30 seconds.
      </p>

      <h2>Services</h2>
      <ul>
        <li><strong>Traefik</strong> — reverse proxy with auto-TLS and Docker service discovery</li>
        <li><strong>Pi-hole</strong> — DNS-level ad blocking for the whole network</li>
        <li><strong>Homebridge</strong> — HomeKit bridge for smart home devices</li>
        <li><strong>Tailscale</strong> — secure mesh VPN for remote access</li>
        <li><strong>Immich</strong> — self-hosted photo and video backup</li>
        <li><strong>Jellyfin</strong> — media server</li>
        <li><strong>Suwayomi</strong> — self-hosted manga reader</li>
        <li><strong>Paperless-ngx</strong> — document management and OCR</li>
        <li><strong>Beszel</strong> — lightweight system monitoring</li>
      </ul>

      <h2>Storage &amp; Backup</h2>
      <p>
        The NVMe SSD holds the OS, Docker volumes, and application data. Critical data
        (Immich library, Paperless documents) is backed up nightly to an external USB drive
        and optionally to Backblaze B2 via rclone.
      </p>

      <h2>Power &amp; Thermal</h2>
      <p>
        The Pi 5 idles around 4-5W and peaks under 15W with all services running. The
        official active cooler keeps the CPU in the 40-55°C range under normal load.
        Estimated monthly running cost is under S$3.
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
