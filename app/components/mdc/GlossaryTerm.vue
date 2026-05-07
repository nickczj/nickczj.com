<script setup lang="ts">
const props = withDefaults(defineProps<{
  term: string
  definition: string
  open?: boolean
}>(), {
  open: false
})

const expanded = ref(props.open)
</script>

<template>
  <span class="glossary-term">
    <button
      class="glossary-trigger"
      type="button"
      :aria-expanded="expanded"
      :aria-label="expanded ? `Hide definition for ${term}` : `Show definition for ${term}`"
      @click="expanded = !expanded"
    >
      {{ term }}
    </button>
    <span v-if="expanded" class="glossary-definition" role="note">
      {{ definition }}
    </span>
  </span>
</template>

<style scoped>
.glossary-term {
  display: inline;
}

.glossary-trigger {
  display: inline;
  margin: 0;
  padding: 0 0.08em;
  border: 0;
  border-radius: 3px;
  background: transparent;
  color: var(--link);
  cursor: pointer;
  font: inherit;
  text-decoration: underline;
  text-decoration-color: color-mix(in srgb, var(--link) 55%, transparent);
  text-decoration-style: dotted;
  text-decoration-thickness: 1px;
  text-underline-offset: 0.18em;
}

.glossary-trigger:hover {
  color: var(--heading);
  text-decoration-color: currentColor;
}

.glossary-trigger:focus-visible {
  outline: 2px solid var(--link);
  outline-offset: 3px;
}

.glossary-definition {
  color: var(--lede);
}

.glossary-definition::before {
  content: " (";
  color: var(--muted);
}

.glossary-definition::after {
  content: ")";
  color: var(--muted);
}
</style>
