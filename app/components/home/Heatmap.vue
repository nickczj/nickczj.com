<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  seed?: number
  weeks?: number
  days?: number
  cell?: number
  gap?: number
}>(), {
  seed: 11,
  weeks: 53,
  days: 7,
  cell: 10,
  gap: 3
})

function mulberry32(a: number) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const cells = computed(() => {
  const r = mulberry32(props.seed)
  const arr: { w: number; d: number; lvl: number }[] = []
  for (let w = 0; w < props.weeks; w++) {
    for (let d = 0; d < props.days; d++) {
      const v = r()
      const recency = w / props.weeks
      const boosted = v + recency * 0.18
      const lvl =
        boosted < 0.42 ? 0 :
        boosted < 0.66 ? 1 :
        boosted < 0.85 ? 2 :
        boosted < 0.96 ? 3 : 4
      arr.push({ w, d, lvl })
    }
  }
  return arr
})

const W = computed(() => props.weeks * (props.cell + props.gap))
const H = computed(() => props.days * (props.cell + props.gap))
</script>

<template>
  <svg
    class="hm"
    :viewBox="`0 0 ${W} ${H}`"
    preserveAspectRatio="xMinYMid meet"
    :style="{ height: H + 'px' }"
  >
    <rect
      v-for="(c, i) in cells"
      :key="i"
      :x="c.w * (cell + gap)"
      :y="c.d * (cell + gap)"
      :width="cell"
      :height="cell"
      rx="2"
      :class="`hm-c hm-l${c.lvl}`"
    />
  </svg>
</template>
