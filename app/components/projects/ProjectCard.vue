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
  <NuxtLink :to="`/projects/${project.slug}`" class="project-card">
    <component :is="visual" v-if="visual" class="project-card-visual" />
    <img
      v-else-if="project.image"
      :src="project.image"
      :alt="project.title"
      class="project-card-visual"
    />
    <div class="project-card-body">
      <div class="project-card-header">
        <h2 class="project-card-title">{{ project.title }}</h2>
        <StatusBadge :status="project.status" />
      </div>
      <p class="project-card-desc">{{ project.description }}</p>
      <div v-if="project.techs.length" class="project-card-techs">
        <span v-for="tech in project.techs" :key="tech" class="tech-tag">{{ tech }}</span>
      </div>
    </div>
  </NuxtLink>
</template>
