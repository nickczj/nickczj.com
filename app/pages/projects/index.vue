<script setup lang="ts">
import type { Component } from 'vue'
import '~/assets/projects.css'
import { publishedProjects } from '~/data/projects'
import ProjectCard from '~/components/projects/ProjectCard.vue'
import ProjectFeature from '~/components/projects/ProjectFeature.vue'
import HomelabTopologyCard from '~/components/projects/cards/HomelabTopologyCard.vue'
import FireMathCard from '~/components/projects/cards/FireMathCard.vue'
import HeltecTopologyCard from '~/components/projects/cards/HeltecTopologyCard.vue'
import EinkTopologyCard from '~/components/projects/cards/EinkTopologyCard.vue'

const cardVisuals: Record<string, Component> = {
  homelab: HomelabTopologyCard,
  'fire-finance-math': FireMathCard,
  'esp32-heltec-wireless-paper': HeltecTopologyCard,
  'esp32-eink-spectra6': EinkTopologyCard,
}

const featuredProject = publishedProjects.find((project) => project.slug === 'homelab')
const secondaryProjects = publishedProjects.filter((project) => project.slug !== 'homelab')

useSeoMeta({
  title: 'Projects | nickczj.com',
  description: 'Things I have built: homelab infrastructure, finance tools, embedded hardware projects.'
})
</script>

<template>
  <section class="page">
    <header class="page-header">
      <p class="eyebrow ornament" aria-hidden="true">
        <svg width="42" height="5" viewBox="0 0 42 5" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0 2.5h16l3-2 3 2h20" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </p>
      <h1>Projects</h1>
      <p class="lede">
        Things I have designed, built, and run — from homelab infrastructure to embedded hardware and Singapore finance tools.
      </p>
    </header>

    <div v-if="featuredProject || secondaryProjects.length" class="project-showcase">
      <ProjectFeature
        v-if="featuredProject"
        :project="featuredProject"
        :visual="cardVisuals[featuredProject.slug]"
      />

      <div v-if="secondaryProjects.length" class="project-grid">
        <ProjectCard
          v-for="project in secondaryProjects"
          :key="project.slug"
          :project="project"
          :visual="cardVisuals[project.slug]"
        />
      </div>
    </div>

    <div v-else class="empty-state">
      <p>No projects published yet.</p>
    </div>
  </section>
</template>

<style scoped>
h1 {
  font-size: clamp(1.8rem, 5vw, 3rem);
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
