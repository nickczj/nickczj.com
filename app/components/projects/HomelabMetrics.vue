<script setup lang="ts">
type HomelabKpiKey = 'cpu' | 'mem' | 'temp' | 'load'
type HomelabTone = 'ok' | 'warn' | 'bad'
type HomelabKpi = {
  key: HomelabKpiKey
  label: string
  unit: string
  value: number | null
  window: string
  tone: HomelabTone
}
type HomelabHistorySample = {
  at: string
  kpis: Partial<Record<HomelabKpiKey, number | null>>
}
type HomelabStatusResponse = {
  data: {
    version: 1
    node: { name: string; uptimeSeconds: number }
    kpis: HomelabKpi[]
    services: unknown[]
  } | null
  history: HomelabHistorySample[]
  updatedAt: string | null
  fetchedAt: string
  stale: boolean
  unavailable: boolean
  source: string
}

const DEFAULT_KPIS: HomelabKpi[] = [
  { key: 'cpu', label: 'CPU', unit: '%', value: null, window: '1m', tone: 'warn' },
  { key: 'mem', label: 'Memory', unit: '%', value: null, window: '1m', tone: 'warn' },
  { key: 'temp', label: 'Temp', unit: '°C', value: null, window: '1m', tone: 'warn' },
  { key: 'load', label: 'Load', unit: '', value: null, window: '1m', tone: 'warn' }
]

const emptyStatus = (): HomelabStatusResponse => ({
  data: null,
  history: [],
  updatedAt: null,
  fetchedAt: new Date(0).toISOString(),
  stale: true,
  unavailable: true,
  source: 'none'
})

const { data: status, refresh } = await useFetch<HomelabStatusResponse>('/api/status', {
  default: emptyStatus
})

let timer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  refresh()
  timer = setInterval(() => refresh(), 30000)
})

onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
})

const kpis = computed(() => {
  const source = status.value?.data?.kpis?.length ? status.value.data.kpis : DEFAULT_KPIS
  return source.map((kpi) => ({
    ...kpi,
    historyValues: (status.value?.history ?? [])
      .map((s) => s.kpis[kpi.key])
      .filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
  }))
})

const toneLabel = computed(() => {
  if (status.value?.unavailable) return 'offline'
  if (status.value?.stale) return 'stale'
  return 'live'
})

function formatValue(value: number | null) {
  if (value === null) return '--'
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

function timeAgo(value: string | null) {
  if (!value) return 'never'
  const ageMs = Date.now() - Date.parse(value)
  if (!Number.isFinite(ageMs) || ageMs < 0) return 'now'
  const seconds = Math.floor(ageMs / 1000)
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 48) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

const svgPath = (values: number[], height: number, min: number, max: number) => {
  if (values.length < 2) return ''
  const w = 100
  const range = max - min || 1
  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w
    const y = height - ((v - min) / range) * height
    return `${x},${y}`
  })
  return `M${points.join(' L')}`
}
</script>

<template>
  <section class="metrics-section">
    <div class="metrics-header">
      <h2>Live System Metrics</h2>
      <span :class="['metrics-tone', `tone-${status?.unavailable ? 'bad' : status?.stale ? 'warn' : 'ok'}`]">
        <span class="tone-dot" />
        {{ toneLabel }} · {{ timeAgo(status?.updatedAt ?? null) }}
      </span>
    </div>

    <div class="kpi-grid">
      <div
        v-for="k in kpis"
        :key="k.key"
        :class="['kpi-tile', `tone-${k.tone}`]"
      >
        <div class="kpi-h">
          <span class="kpi-label">{{ k.label }}</span>
          <span class="kpi-window">{{ k.window }}</span>
        </div>
        <div class="kpi-value">
          <span class="kpi-num">{{ formatValue(k.value) }}</span>
          <span v-if="k.value !== null && k.unit" class="kpi-unit">{{ k.unit }}</span>
        </div>
        <svg
          v-if="k.historyValues.length >= 2"
          class="kpi-spark"
          viewBox="0 0 100 22"
          preserveAspectRatio="none"
        >
          <path
            :d="svgPath(k.historyValues, 22, Math.min(...k.historyValues), Math.max(...k.historyValues))"
            fill="none"
            :stroke="k.tone === 'ok' ? 'var(--link)' : k.tone === 'warn' ? 'var(--eyebrow)' : 'var(--red, #c44)'"
            stroke-width="1.5"
            vector-effect="non-scaling-stroke"
          />
        </svg>
        <div v-else class="kpi-spark-placeholder" />
      </div>
    </div>
  </section>
</template>
