<script setup lang="ts">
import type { Component } from 'vue'
import '~/assets/projects.css'
import { publishedProjects } from '~/data/projects'
import ProjectCard from '~/components/projects/ProjectCard.vue'
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

useSeoMeta({
  title: 'Projects | nickczj.com',
  description: 'Things I have built: homelab infrastructure, finance tools, embedded hardware projects.'
})
</script>

<template>
  <section class="page">
    <header class="page-header">
      <p class="eyebrow">Portfolio</p>
      <h1>Projects</h1>
      <p class="lede">
        Things I have designed, built, and run — from homelab infrastructure to embedded hardware and Singapore finance tools.
      </p>
    </header>

    <div v-if="publishedProjects.length" class="project-grid">
      <ProjectCard
        v-for="project in publishedProjects"
        :key="project.slug"
        :project="project"
        :visual="cardVisuals[project.slug]"
      />
    </div>

    <div v-else class="empty-state">
      <p>No projects published yet.</p>
    </div>
  </section>
</template>
