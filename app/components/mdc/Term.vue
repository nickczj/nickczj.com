<script setup lang="ts">
import glossary from '~/data/glossary'

const props = defineProps<{ def: string }>()

const entry = computed(() => glossary[props.def])
const open = ref(false)

function onClick() {
  if (window.matchMedia('(hover: none)').matches) {
    open.value = !open.value
  }
}
</script>

<template>
  <dfn
    class="term"
    :class="{ 'is-open': open }"
    tabindex="0"
    @click="onClick"
  >
    <slot />
    <span v-if="entry" role="tooltip" class="term__pop">{{ entry.short }}</span>
  </dfn>
</template>
