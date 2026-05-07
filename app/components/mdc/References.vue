<script setup lang="ts">
import sources from '~/data/sources'

const registry = useCiteRegistry()
const keys = computed(() => registry.all())

const items = computed(() =>
  keys.value.map((id) => ({
    id,
    source: sources[id],
    number: keys.value.indexOf(id) + 1,
  }))
)

function format(s: (typeof items.value)[number]['source']): string {
  if (!s) return '[unknown]'
  const parts = [s.authors, `(${s.year})`, s.title]
  if (s.edition) parts.push(s.edition)
  if (s.venue) parts.push(s.venue)
  if (s.publisher) parts.push(s.publisher)
  if (s.pages) parts.push(`pp. ${s.pages}`)
  return parts.join('. ') + '.'
}
</script>

<template>
  <section v-if="keys.length" class="references">
    <h2 class="references__heading">References</h2>
    <ol>
      <li v-for="item in items" :key="item.id" :id="`ref-${item.id}`">
        {{ format(item.source) }}
      </li>
    </ol>
  </section>
</template>
