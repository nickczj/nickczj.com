<script setup lang="ts">
withDefaults(defineProps<{
  tone?: '' | 'ok' | 'warn' | 'bad' | 'info'
  dot?: boolean
}>(), {
  tone: '',
  dot: false
})
</script>

<template>
  <span :class="['pill', tone]">
    <span v-if="dot" class="dot" />
    <slot />
  </span>
</template>
