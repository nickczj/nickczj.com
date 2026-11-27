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

/* katex.css bleeds display math to the screen edges on phones. This wrapper
   clips that bleed (the FIRE math card needs the clip), so keep the inner
   scroller inside it: one scroll box, nothing cut off at either side. */
.latex-display :deep(.katex-display) {
  margin-inline: 0;
}

.latex-display :deep(.katex) {
  font-size: 1.1em;
}
</style>
