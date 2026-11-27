<script setup lang="ts">
const CELL = 10
const GAP = 3
const STEP = CELL + GAP

const { contributions, status } = useGitHubContributions()

const numberFormat = new Intl.NumberFormat('en-SG')

// GitHub's first week starts on whatever weekday falls a year back, so a
// short first week is pushed down to line up with its real weekdays.
const cells = computed(() => {
  const weeks = contributions.value?.weeks ?? []
  return weeks.flatMap((week, w) => {
    const offset = w === 0 ? 7 - week.length : 0
    return week.map((day, d) => ({ key: `${w}-${d}`, x: w * STEP, y: (d + offset) * STEP, level: day.level }))
  })
})

const width = computed(() => Math.max(0, (contributions.value?.weeks.length ?? 0) * STEP - GAP))
const height = 7 * STEP - GAP

const summary = computed(() => {
  const data = contributions.value
  if (!data) return ''
  const days = data.streak === 1 ? 'day' : 'days'
  const cached = 'stale' in data && data.stale ? ' · cached' : ''
  return `${numberFormat.format(data.totalContributions)} contributions · current streak ${data.streak} ${days}${cached}`
})

const scroller = ref<HTMLElement | null>(null)

// On narrow screens the calendar scrolls sideways; start at the recent end.
watch(cells, () => {
  if (scroller.value) scroller.value.scrollLeft = scroller.value.scrollWidth
}, { flush: 'post', immediate: true })
</script>

<template>
  <section class="github" aria-labelledby="github-title">
    <div class="github-h">
      <h2 id="github-title">GitHub, last 12 months</h2>
      <p v-if="summary" class="github-meta">{{ summary }}</p>
    </div>

    <div v-if="cells.length" ref="scroller" class="github-scroll">
      <svg
        :width="width"
        :height="height"
        :viewBox="`0 0 ${width} ${height}`"
        role="img"
        :aria-label="`Contribution calendar: ${summary}`"
      >
        <rect
          v-for="cell in cells"
          :key="cell.key"
          :x="cell.x"
          :y="cell.y"
          :width="CELL"
          :height="CELL"
          rx="2"
          :class="`lvl-${cell.level}`"
        />
      </svg>
    </div>
    <p v-else class="github-empty">
      {{ status === 'error' || status === 'success' ? 'Contribution data is unavailable right now.' : 'Loading contributions…' }}
    </p>

    <div class="github-foot">
      <span class="github-legend" aria-hidden="true">
        less
        <span class="swatches">
          <span v-for="level in 5" :key="level" :class="['swatch', `lvl-${level - 1}`]" />
        </span>
        more
      </span>
      <a href="https://github.com/nickczj" target="_blank" rel="noopener">github.com/nickczj</a>
    </div>
  </section>
</template>

<style scoped>
.github {
  --lvl-0: #e5e1d6;
  --lvl-4: #15a467;
  display: grid;
  gap: 0.75rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--rule);
}

[data-theme="dark"] .github {
  --lvl-0: #2d322f;
  --lvl-4: #4ee398;
}

.github-h {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.25rem 1rem;
}

.github-h h2 {
  margin: 0;
  font-size: 1.15rem;
}

.github-meta {
  margin: 0;
  color: var(--muted);
  font-size: 0.85rem;
  font-variant-numeric: tabular-nums;
  line-height: 1.4;
}

.github-scroll {
  overflow-x: auto;
  padding-bottom: 0.25rem;
}

.github-scroll svg {
  display: block;
}

.github-empty {
  display: grid;
  align-items: center;
  min-height: 88px;
  margin: 0;
  color: var(--muted);
  font-size: 0.9rem;
}

.github-foot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem 1rem;
  color: var(--muted);
  font-size: 0.8rem;
}

.github-legend {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}

.swatches {
  display: inline-flex;
  gap: 2px;
}

.swatch {
  width: 10px;
  height: 10px;
  border-radius: 2px;
}

.lvl-0 { fill: var(--lvl-0); background: var(--lvl-0); }
.lvl-1 { fill: color-mix(in srgb, var(--lvl-4) 28%, var(--lvl-0)); background: color-mix(in srgb, var(--lvl-4) 28%, var(--lvl-0)); }
.lvl-2 { fill: color-mix(in srgb, var(--lvl-4) 55%, var(--lvl-0)); background: color-mix(in srgb, var(--lvl-4) 55%, var(--lvl-0)); }
.lvl-3 { fill: color-mix(in srgb, var(--lvl-4) 80%, var(--lvl-0)); background: color-mix(in srgb, var(--lvl-4) 80%, var(--lvl-0)); }
.lvl-4 { fill: var(--lvl-4); background: var(--lvl-4); }
</style>
