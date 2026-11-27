<script setup lang="ts">
import { computed, useId } from 'vue'
import type { HomelabTone } from '#shared/homelab/types'

// Sparkline of real readings. Fewer than two readings draws a flat line;
// it never makes data up.
const props = withDefaults(defineProps<{
  values: number[]
  tone?: HomelabTone
  w?: number
  h?: number
}>(), {
  tone: 'ok',
  w: 120,
  h: 22
})

const fillId = `spark-fill-${useId()}`

const path = computed(() => {
  const { values, w, h } = props
  if (values.length < 2) {
    const mid = (h / 2).toFixed(1)
    return `M0,${mid} L${w},${mid}`
  }

  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = Math.max(1, max - min)
  return values.map((value, i) => {
    const x = (i / (values.length - 1)) * w
    const y = h - 3 - ((value - min) / range) * (h - 6)
    return `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
})

const stroke = computed(() =>
  props.tone === 'warn' ? 'var(--warn)'
    : props.tone === 'bad' ? 'var(--bad)'
      : 'var(--accent-2)'
)
</script>

<template>
  <svg
    :viewBox="`0 0 ${w} ${h}`"
    preserveAspectRatio="none"
    :style="{ display: 'block', width: '100%', height: `${h}px` }"
    aria-hidden="true"
  >
    <defs>
      <linearGradient :id="fillId" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" :stop-color="stroke" stop-opacity="0.18" />
        <stop offset="100%" :stop-color="stroke" stop-opacity="0" />
      </linearGradient>
    </defs>
    <path :d="`${path} L ${w} ${h} L 0 ${h} Z`" :fill="`url(#${fillId})`" />
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
