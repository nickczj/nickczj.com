<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  seed?: number
  w?: number
  h?: number
  tone?: '' | 'warn' | 'bad'
  tick?: number
  values?: number[]
}>(), {
  seed: 1,
  w: 120,
  h: 22,
  tone: '',
  tick: 0,
  values: undefined
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

const path = computed(() => {
  if (props.values) {
    if (props.values.length < 2) {
      const mid = props.h / 2
      return `M0,${mid.toFixed(1)} L${props.w},${mid.toFixed(1)}`
    }

    const min = Math.min(...props.values)
    const max = Math.max(...props.values)
    const range = Math.max(1, max - min)
    return props.values.map((value, i) => {
      const x = (i / (props.values!.length - 1)) * props.w
      const y = props.h - 3 - ((value - min) / range) * (props.h - 6)
      return (i ? 'L' : 'M') + x.toFixed(1) + ',' + y.toFixed(1)
    }).join(' ')
  }

  const r = mulberry32(props.seed + props.tick)
  const pts = 24
  const xs = Array.from({ length: pts }, (_, i) => (i / (pts - 1)) * props.w)
  const ys = Array.from({ length: pts }, () => 3 + r() * (props.h - 6))
  return xs.map((x, i) => (i ? 'L' : 'M') + x.toFixed(1) + ',' + ys[i].toFixed(1)).join(' ')
})

const stroke = computed(() =>
  props.tone === 'warn' ? 'var(--warn)' :
  props.tone === 'bad' ? 'var(--bad)' :
  'var(--accent-2)'
)

const fillId = computed(() => `home-spark-fill-${props.seed}`)
const fillUrl = computed(() => `url(#${fillId.value})`)
const closedPath = computed(() => `${path.value} L ${props.w} ${props.h} L 0 ${props.h} Z`)
</script>

<template>
  <svg
    :viewBox="`0 0 ${w} ${h}`"
    preserveAspectRatio="none"
    :style="{ width: '100%', height: h + 'px', display: 'block' }"
  >
    <defs>
      <linearGradient :id="fillId" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" :stop-color="stroke" stop-opacity="0.18" />
        <stop offset="100%" :stop-color="stroke" stop-opacity="0" />
      </linearGradient>
    </defs>
    <path :d="closedPath" :fill="fillUrl" />
    <path
      :d="path"
      fill="none"
      :stroke="stroke"
      stroke-width="1.4"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
</template>
