<script setup lang="ts">
import type { Component } from 'vue'
import type { Project } from '~/data/projects'
import StatusBadge from './StatusBadge.vue'

defineProps<{
  project: Project
  visual?: Component
}>()
</script>

<template>
  <article class="project-feature">
    <div v-if="visual || project.image" class="project-feature-visual">
      <component :is="visual" v-if="visual" />
      <img
        v-else-if="project.image"
        :src="project.image"
        :alt="project.title"
        class="project-card-image"
      />
    </div>

    <div class="project-feature-body">
      <div class="project-feature-kicker">
        <span>Featured project</span>
        <StatusBadge :status="project.status" />
      </div>

      <h2 class="project-feature-title">
        <NuxtLink :to="`/projects/${project.slug}`">{{ project.title }}</NuxtLink>
      </h2>

      <p class="project-feature-desc">{{ project.description }}</p>

      <div v-if="project.techs.length" class="project-card-techs">
        <span v-for="tech in project.techs" :key="tech" class="tech-tag">{{ tech }}</span>
      </div>

      <NuxtLink :to="`/projects/${project.slug}`" class="project-card-link">Open project</NuxtLink>
    </div>
  </article>
</template>
