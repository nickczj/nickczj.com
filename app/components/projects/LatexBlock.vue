<script setup lang="ts">
import katex from 'katex'

const props = withDefaults(defineProps<{
  expression: string
  display?: boolean
}>(), {
  display: false
})

const html = computed(() => {
  try {
    return katex.renderToString(props.expression, {
      displayMode: props.display,
      throwOnError: false
    })
  } catch {
    return props.expression
  }
})
</script>

<template>
  <span v-if="!display" class="latex-inline" v-html="html" />
  <div v-else class="latex-display" v-html="html" />
</template>

<style scoped>
.latex-inline {
  display: inline;
}

.latex-display {
  margin: 1.5rem 0;
  overflow-x: auto;
  text-align: center;
}

.latex-display :deep(.katex) {
  font-size: 1.1em;
}
</style>
