<script setup lang="ts">
import type { AccuracyReading } from '#shared/watches/schema'
import { formatRate } from '#shared/watches/format'

const props = withDefaults(defineProps<{
  readings: AccuracyReading[]
  /** Reference band in s/day, e.g. COSC [-4, 6]. */
  band?: [number, number] | null
  bandLabel?: string
}>(), {
  band: null,
  bandLabel: ''
})

const HEIGHT = 180
const MARGIN = { top: 14, right: 84, bottom: 28, left: 40 }

const dateFormatter = new Intl.DateTimeFormat('en-SG', { dateStyle: 'medium', timeZone: 'UTC' })
const formatDate = (value: string) => dateFormatter.format(new Date(`${value}T00:00:00.000Z`))
const formatTick = (value: number) => (value > 0 ? `+${value}` : value < 0 ? `−${Math.abs(value)}` : '0')

const frame = ref<HTMLElement | null>(null)
const width = ref(640)
let observer: ResizeObserver | null = null

onMounted(() => {
  if (!frame.value) return
  observer = new ResizeObserver(([entry]) => {
    if (entry) width.value = Math.max(280, Math.round(entry.contentRect.width))
  })
  observer.observe(frame.value)
})
onBeforeUnmount(() => observer?.disconnect())

const sorted = computed(() => [...props.readings].sort((a, b) => a.date.localeCompare(b.date)))

const yDomain = computed(() => {
  const values = sorted.value.map(reading => reading.seconds_per_day)
  const extent = [0, ...values, ...(props.band ?? [])]
  let min = Math.min(...extent)
  let max = Math.max(...extent)
  const step = [1, 2, 5, 10, 20, 50].find(candidate => (max - min) / candidate <= 4) ?? 50
  min = Math.floor(min / step) * step
  max = Math.ceil(max / step) * step
  if (min === max) {
    min -= step
    max += step
  }
  const ticks: number[] = []
  for (let tick = min; tick <= max; tick += step) ticks.push(tick)
  return { min, max, ticks }
})

const plot = computed(() => ({
  x0: MARGIN.left,
  x1: width.value - MARGIN.right,
  y0: MARGIN.top,
  y1: HEIGHT - MARGIN.bottom
}))

function y(value: number): number {
  const { min, max } = yDomain.value
  return plot.value.y1 - ((value - min) / (max - min)) * (plot.value.y1 - plot.value.y0)
}

const points = computed(() => {
  const times = sorted.value.map(reading => Date.parse(`${reading.date}T00:00:00Z`))
  const t0 = Math.min(...times)
  const t1 = Math.max(...times)
  const { x0, x1 } = plot.value
  return sorted.value.map((reading, i) => ({
    reading,
    x: t1 === t0 ? (x0 + x1) / 2 : x0 + ((times[i]! - t0) / (t1 - t0)) * (x1 - x0),
    y: y(reading.seconds_per_day)
  }))
})

const linePath = computed(() =>
  points.value.map((point, i) => `${i ? 'L' : 'M'}${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' ')
)

const latest = computed(() => points.value[points.value.length - 1])
const first = computed(() => points.value[0])

const bandRect = computed(() => {
  if (!props.band) return null
  const top = y(Math.max(...props.band))
  return { y: top, height: y(Math.min(...props.band)) - top }
})

const active = ref<number | null>(null)
const activePoint = computed(() => (active.value === null ? null : points.value[active.value] ?? null))

const summary = computed(() => {
  if (!latest.value || !first.value) return ''
  const span = sorted.value.length > 1
    ? `${sorted.value.length} readings from ${formatDate(first.value.reading.date)} to ${formatDate(latest.value.reading.date)}`
    : `One reading on ${formatDate(latest.value.reading.date)}`
  return `${span}; latest ${formatRate(latest.value.reading.seconds_per_day)}.`
})
</script>

<template>
  <figure v-if="sorted.length" class="accuracy">
    <div ref="frame" class="accuracy-frame">
      <svg
        :width="width"
        :height="HEIGHT"
        :viewBox="`0 0 ${width} ${HEIGHT}`"
        role="img"
        :aria-label="`Accuracy in seconds per day. ${summary}`"
      >
        <rect
          v-if="bandRect"
          class="accuracy-band"
          :x="plot.x0"
          :y="bandRect.y"
          :width="plot.x1 - plot.x0"
          :height="bandRect.height"
        />

        <g aria-hidden="true">
          <template v-for="tick in yDomain.ticks" :key="tick">
            <line
              :class="tick === 0 ? 'accuracy-zero' : 'accuracy-grid'"
              :x1="plot.x0"
              :x2="plot.x1"
              :y1="y(tick)"
              :y2="y(tick)"
            />
            <text class="accuracy-axis" :x="plot.x0 - 8" :y="y(tick) + 4" text-anchor="end">{{ formatTick(tick) }}</text>
          </template>
          <text
            v-if="first"
            class="accuracy-axis"
            :x="points.length > 1 ? plot.x0 : first.x"
            :y="HEIGHT - 8"
            :text-anchor="points.length > 1 ? 'start' : 'middle'"
          >{{ formatDate(first.reading.date) }}</text>
          <text
            v-if="latest && points.length > 1"
            class="accuracy-axis"
            :x="plot.x1"
            :y="HEIGHT - 8"
            text-anchor="end"
          >{{ formatDate(latest.reading.date) }}</text>
        </g>

        <path v-if="points.length > 1" class="accuracy-line" :d="linePath" />

        <g
          v-for="(point, i) in points"
          :key="point.reading.date + i"
          class="accuracy-point"
          tabindex="0"
          :aria-label="`${formatDate(point.reading.date)}: ${formatRate(point.reading.seconds_per_day)}${point.reading.note ? `, ${point.reading.note}` : ''}`"
          @pointerenter="active = i"
          @pointerleave="active = null"
          @focus="active = i"
          @blur="active = null"
        >
          <circle class="accuracy-hit" :cx="point.x" :cy="point.y" r="14" />
          <circle class="accuracy-dot" :class="{ 'is-active': active === i }" :cx="point.x" :cy="point.y" r="4.5" />
        </g>

        <text
          v-if="latest"
          class="accuracy-label"
          :x="latest.x + 12"
          :y="latest.y + 4"
        >{{ formatRate(latest.reading.seconds_per_day) }}</text>
      </svg>

      <div
        v-if="activePoint"
        class="accuracy-tooltip"
        role="status"
        :style="{
          left: `${activePoint.x}px`,
          top: `${activePoint.y}px`,
          transform: activePoint.x > width - 160 ? 'translate(-100%, -100%) translate(-10px, -10px)' : 'translate(10px, -100%) translate(0, -10px)'
        }"
      >
        <strong>{{ formatRate(activePoint.reading.seconds_per_day) }}</strong>
        <span>{{ formatDate(activePoint.reading.date) }}</span>
        <span v-if="activePoint.reading.note">{{ activePoint.reading.note }}</span>
      </div>
    </div>

    <figcaption class="accuracy-caption">
      <span>{{ summary }}</span>
      <span v-if="bandRect && bandLabel" class="accuracy-key">
        <span class="accuracy-key-swatch" aria-hidden="true" />
        Shaded: {{ bandLabel }}
      </span>
    </figcaption>

    <details class="accuracy-table">
      <summary>All readings</summary>
      <table>
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Rate</th>
            <th scope="col">Note</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(reading, i) in [...sorted].reverse()" :key="reading.date + i">
            <td><time :datetime="reading.date">{{ formatDate(reading.date) }}</time></td>
            <td class="num">{{ formatRate(reading.seconds_per_day) }}</td>
            <td>{{ reading.note ?? '' }}</td>
          </tr>
        </tbody>
      </table>
    </details>
  </figure>
</template>

<style scoped>
.accuracy {
  display: grid;
  gap: 0.6rem;
  margin: 0;
}

.accuracy-frame {
  position: relative;
  width: 100%;
}

/* Until the frame is measured (SSR renders at 640px), scale down instead of overflowing. */
.accuracy-frame svg {
  display: block;
  max-width: 100%;
  height: auto;
  overflow: visible;
}

.accuracy-band {
  fill: var(--code-bg);
}

.accuracy-axis {
  fill: var(--muted);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}

.accuracy-grid {
  stroke: var(--rule);
  stroke-width: 1;
}

.accuracy-zero {
  stroke: var(--muted);
  stroke-opacity: 0.55;
  stroke-width: 1;
}

.accuracy-line {
  fill: none;
  stroke: var(--link);
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.accuracy-point {
  cursor: default;
  outline: none;
}

.accuracy-hit {
  fill: transparent;
}

.accuracy-dot {
  fill: var(--link);
  stroke: var(--bg);
  stroke-width: 2;
}

.accuracy-dot.is-active,
.accuracy-point:focus-visible .accuracy-dot {
  r: 6;
}

.accuracy-label {
  fill: var(--text);
  font-size: 12px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.accuracy-tooltip {
  position: absolute;
  z-index: 1;
  display: grid;
  gap: 0.1rem;
  min-width: 8rem;
  padding: 0.45rem 0.6rem;
  border: 1px solid var(--code-border);
  border-radius: 6px;
  background: var(--bg);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.12);
  color: var(--text);
  font-size: 0.8rem;
  line-height: 1.4;
  pointer-events: none;
  white-space: nowrap;
}

.accuracy-tooltip span {
  color: var(--muted);
}

.accuracy-caption {
  display: grid;
  gap: 0.25rem;
  color: var(--muted);
  font-size: 0.85rem;
  line-height: 1.5;
}

.accuracy-key {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}

.accuracy-key-swatch {
  width: 0.85rem;
  height: 0.6rem;
  border: 1px solid var(--code-border);
  border-radius: 2px;
  background: var(--code-bg);
}

.accuracy-table summary {
  cursor: pointer;
  color: var(--link);
  font-size: 0.88rem;
  font-weight: 650;
}

.accuracy-table table {
  width: 100%;
  margin-top: 0.6rem;
  border-collapse: collapse;
  font-size: 0.88rem;
}

.accuracy-table th,
.accuracy-table td {
  padding: 0.4rem 0.5rem 0.4rem 0;
  border-bottom: 1px solid var(--rule);
  text-align: left;
}

.accuracy-table th {
  color: var(--muted);
  font-weight: 650;
}

.accuracy-table .num {
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
</style>
