<script setup lang="ts">
defineProps<{
  status: 'active' | 'archived' | 'experimental'
}>()
</script>

<template>
  <span :class="['status-badge', `status-${status}`]">{{ status }}</span>
</template>
