<script setup lang="ts">
import '~/assets/projects.css'
import { getProject } from '~/data/projects'
import StatusBadge from '~/components/projects/StatusBadge.vue'

const project = getProject('homelab')

if (!project) {
  throw createError({ statusCode: 404, statusMessage: 'Project not found' })
}

useSeoMeta({
  title: 'Homelab | nickczj.com',
  description: project.description
})

const { status, view } = useHomelabStatus({ pollMs: 30_000 })
const terminalOpen = ref(false)
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
    </header>

    <HomelabStatusPanel :view="view">
      <template #footer>
        <span>live from /api/status · refreshes every 30s</span>
        <button type="button" class="terminal-hint" @click="terminalOpen = true">
          press <span class="kbd">`</span> for a terminal
        </button>
      </template>
    </HomelabStatusPanel>

    <section class="prose">
      <h2>Hardware</h2>
      <table class="specs-table">
        <tbody>
          <tr>
            <th>UGREEN DXP4800 Plus</th>
            <td>Four-bay NAS with an Intel N100, running UGOS and Docker. Storage, backups and most services. On a UPS.</td>
          </tr>
          <tr>
            <th>Raspberry Pi 5, 8 GB</th>
            <td>DietPi. The primary Pi-hole and a few small always-on services.</td>
          </tr>
          <tr>
            <th>Home Assistant Yellow</th>
            <td>Compute Module 5 with an SSD, running Home Assistant OS. Zigbee through a Connect ZBT-2, and the onboard radio is a Thread border router.</td>
          </tr>
        </tbody>
      </table>

      <h2>How it fits together</h2>
      <p>
        Each service on the NAS is its own Docker Compose stack, and Traefik routes a hostname to each one.
        Remote access goes through Tailscale rather than open ports. DNS has two Pi-holes, the primary on the
        Raspberry Pi and a secondary on the NAS, kept in sync by nebula-sync.
      </p>

      <h2>The status panel</h2>
      <p>
        Every two minutes, a small Bun script on the NAS and the Pi, and a Rust add-on on the Home Assistant
        Yellow, send CPU, memory, temperature, load and service health to this site. A Cloudflare Pages Function
        stores the readings in D1 and serves them at <code>/api/status</code>, which the panel above polls every
        30 seconds. The services listed are whatever the machines report, so the panel cannot drift from what is
        actually running. A separate Cloudflare Worker watches the same database and sends me a Telegram alert
        when every machine goes quiet at once, which usually means the internet at home is down.
      </p>

      <h2>Services</h2>
      <ul>
        <li><strong>Immich</strong>: photo and video backup</li>
        <li><strong>Jellyfin</strong> and <strong>Navidrome</strong>: films, shows and music</li>
        <li><strong>Suwayomi</strong> and <strong>Komga</strong>: manga</li>
        <li><strong>Kiwix</strong>: offline wikis</li>
        <li><strong>Forgejo</strong>: self-hosted Git</li>
        <li><strong>Shlink</strong>: short links, on the Pi</li>
        <li><strong>Beszel</strong> and <strong>Scrutiny</strong>: system and disk health</li>
        <li><strong>Backrest</strong>: restic backups with a web UI</li>
        <li><strong>Diun</strong>: alerts when a container image has an update</li>
      </ul>

      <h2>Storage and backups</h2>
      <p>
        The NAS holds the data and the Docker volumes. Backrest runs two nightly restic backups: service config
        and database dumps go to Cloudflare R2, and the Immich photo library goes to an SSD on my Mac mini, so
        the photos have a copy off the NAS.
      </p>
    </section>

    <HomelabTerminal v-model:open="terminalOpen" :homelab-status="status" />
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

.terminal-hint {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  cursor: pointer;
}

.terminal-hint:hover {
  color: var(--ink);
}

.prose code {
  font-family: ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace;
  font-size: 0.9em;
}
</style>
