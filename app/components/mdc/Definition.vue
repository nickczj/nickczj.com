<script setup lang="ts">
withDefaults(defineProps<{
  term: string
  label?: string
  open?: boolean
}>(), {
  label: 'Definition',
  open: false
})
</script>

<template>
  <details class="definition" :open="open">
    <summary class="definition-summary">
      <span class="definition-kicker">{{ label }}</span>
      <span class="definition-term">{{ term }}</span>
      <span class="definition-toggle" aria-hidden="true" />
    </summary>
    <div class="definition-body">
      <MDCSlot unwrap="p" />
    </div>
  </details>
</template>

<style scoped>
.definition {
  margin: 1rem 0;
  border-left: 3px solid var(--link);
  color: var(--prose);
}

.definition-summary {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: baseline;
  gap: 0.65rem;
  padding: 0.65rem 0 0.65rem 1rem;
  cursor: pointer;
  list-style: none;
}

.definition-summary::-webkit-details-marker {
  display: none;
}

.definition-summary:focus-visible {
  outline: 2px solid var(--link);
  outline-offset: 4px;
}

.definition-kicker {
  color: var(--muted);
  font-size: 0.72rem;
  font-weight: 750;
  letter-spacing: 0;
  text-transform: uppercase;
}

.definition-term {
  color: var(--heading);
  font-weight: 760;
}

.definition-toggle {
  width: 0.55rem;
  height: 0.55rem;
  border-right: 1.5px solid var(--muted);
  border-bottom: 1.5px solid var(--muted);
  transform: rotate(45deg) translateY(-0.12rem);
  transition: transform 0.18s ease;
}

.definition[open] .definition-toggle {
  transform: rotate(225deg) translateY(-0.12rem);
}

.definition-body {
  padding: 0 0 0.85rem 1rem;
  color: var(--lede);
  line-height: 1.65;
}
</style>
