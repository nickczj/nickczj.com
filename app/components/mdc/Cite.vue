<script setup lang="ts">
import sources from '~/data/sources'

const slots = useSlots()

const key = computed(() => {
  const vnodes = slots.default?.()
  if (vnodes?.length) {
    const first = vnodes[0] as Record<string, unknown>
    if (typeof first.children === 'string') return first.children.trim()
  }
  return ''
})

const source = computed(() => sources[key.value])
const registry = useCiteRegistry()
const number = computed(() => registry.register(key.value))

const formatted = computed(() => {
  const s = source.value
  if (!s) return `[unknown: ${key.value}]`
  const parts = [s.authors, `(${s.year})`, s.title]
  if (s.edition) parts.push(s.edition)
  if (s.venue) parts.push(s.venue)
  if (s.publisher) parts.push(s.publisher)
  if (s.pages) parts.push(`pp. ${s.pages}`)
  return parts.join('. ') + '.'
})

const open = ref(false)

function onClick(e: MouseEvent) {
  if (window.matchMedia('(hover: none)').matches) {
    e.preventDefault()
    open.value = !open.value
  }
}
</script>

<template>
  <a
    v-if="key"
    :href="`#ref-${key}`"
    class="cite"
    :class="{ 'is-open': open }"
    :aria-describedby="`cite-pop-${key}`"
    @click="onClick"
  >
    <sup>[{{ number }}]</sup>
    <span :id="`cite-pop-${key}`" role="tooltip" class="cite__pop">
      <span class="cite__pop-num">{{ number }}</span>
      <span class="cite__pop-body">{{ formatted }}</span>
    </span>
  </a>
</template>
