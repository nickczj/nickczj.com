<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import '~/assets/home.css'

useSeoMeta({
  title: 'nick chow — nickczj.com',
  description: 'senior software engineer in singapore. backend-leaning full-stack, homelab tinkerer, sg-finance hobbyist.'
})

definePageMeta({
  layout: false
})

const NICK = {
  initials: 'nc',
  name: 'nick chow',
  role: 'senior software engineer',
  loc: 'singapore'
}

const NAV = [
  { label: '~/home',    href: '/',          on: true },
  { label: 'blog',      href: '/blog' },
  { label: 'projects',  href: '/projects' },
  { label: 'uses',      href: '/uses' },
  { label: 'now',       href: '/now' },
  { label: 'colophon',  href: '/colophon' }
]

type HomelabKpiKey = 'cpu' | 'mem' | 'temp' | 'power' | 'load'
type HomelabTone = 'ok' | 'warn' | 'bad'
type HomelabServiceState = 'up' | 'slow' | 'down'
type HomelabNode = {
  id: string
  name: string
  role: string
  uptimeSeconds: number
}
type HomelabKpi = {
  key: HomelabKpiKey
  label: string
  unit: string
  value: number | null
  window: string
  tone: HomelabTone
}
type HomelabService = {
  name: string
  state: HomelabServiceState
  detail: string
}
type HomelabHistorySample = {
  at: string
  kpis: Partial<Record<HomelabKpiKey, number | null>>
}
type HomelabStatusNode = HomelabNode & {
  kpis: HomelabKpi[]
  services: HomelabService[]
  history: HomelabHistorySample[]
  updatedAt: string
  stale: boolean
}
type HomelabFleetService = HomelabService & {
  nodeId: string
  nodeName: string
}
type HomelabStatusResponse = {
  data: {
    version: 1
    node: HomelabNode
    kpis: HomelabKpi[]
    services: HomelabService[]
  } | null
  nodes: HomelabStatusNode[]
  services: HomelabFleetService[]
  history: HomelabHistorySample[]
  updatedAt: string | null
  fetchedAt: string
  stale: boolean
  unavailable: boolean
  source: 'd1' | 'memory' | 'fixture' | 'none'
}

const DEFAULT_FLEET_NODES = [
  { id: 'nas', name: 'nas', role: 'storage + containers', aliases: ['homelab-v3', 'ugreen-nas', 'ugreen-dxp4800-plus', 'dxp4800-plus'] },
  { id: 'pi5', name: 'Raspberry Pi 5, 8GB', role: 'pi-hole dns, edge services', aliases: ['raspberry-pi-5', 'raspberry-pi-5-8gb', 'rpi5'] },
  { id: 'ha-yellow', name: 'Home Assistant Yellow, CM5', role: 'smart home', aliases: ['home-assistant-yellow', 'yellow'] }
]

const PRIMARY_FLEET_NODE = DEFAULT_FLEET_NODES[0]!
const PRIMARY_KPI_KEYS: HomelabKpiKey[] = ['cpu', 'mem', 'temp', 'load']

const DEFAULT_PRIMARY_KPIS: HomelabKpi[] = [
  { key: 'cpu',  label: 'cpu',  unit: '%', value: null, window: '1m', tone: 'warn' },
  { key: 'mem',  label: 'mem',  unit: '%', value: null, window: '1m', tone: 'warn' },
  { key: 'temp', label: 'temp', unit: 'C', value: null, window: '1m', tone: 'warn' },
  { key: 'load', label: 'load', unit: '',  value: null, window: '1m', tone: 'warn' }
]

const DEFAULT_FLEET_SERVICES = [
  { nodeId: 'nas', name: 'immich_server' },
  { nodeId: 'nas', name: 'paperless' },
  { nodeId: 'pi5', name: 'pihole' },
  { nodeId: 'mesh', name: 'tailscale' }
]

const PROJECTS = [
  { name: 'vesto',           tag: 'v0.2 · in flight', value: 47,  tone: 'ok',   note: 'sg portfolio tool' },
  { name: 'homelab v3',      tag: 'stable',           value: 92,  tone: 'ok',   note: 'docker + traefik' },
  { name: 'cpf-calc',        tag: 'draft',            value: 18,  tone: 'warn', note: 'allocation + bonus' },
  { name: 'cv.nickczj.com',  tag: 'live',             value: 100, tone: 'ok',   note: 'cf pages' }
]

const YIELDS = [
  { name: "ssb may'26", val: '2.81%', delta: '+0.02', dir: 'up'   as const },
  { name: '6m t-bill',  val: '3.04%', delta: '−0.04', dir: 'down' as const },
  { name: 'cpf oa',     val: '2.50%', delta: '0.00',  dir: ''     as const },
  { name: 'cpf sa',     val: '4.04%', delta: '+0.00', dir: 'up'   as const }
]

const SPOTIFY_FALLBACK = {
  artist: '(K)NoW_NAME',
  track: 'Welcome トゥ 混沌',
  url: 'https://open.spotify.com/track/5WFyER9XL7zcDkaj7CuYmv?si=3a2c1929eed540f4'
}

// Currently — reading (content collection)
const { data: readingEntry } = await useAsyncData('home-currently-reading', () =>
  queryCollection('currently').where('draft', '=', false).first()
)

// Currently — dev environment (build-time)
const runtimeConfig = useRuntimeConfig()
const buildEnv = computed(() => {
  const node = (runtimeConfig.public.buildNodeVersion as string) || '?'
  const bun = (runtimeConfig.public.buildBunVersion as string) || '?'
  const os = (runtimeConfig.public.buildOsInfo as string) || '?'
  return { node, bun, os }
})
const commitHash = (runtimeConfig.public.buildCommitHash as string) || '?'

// Blog posts (real data)
const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC'
})
const formatPostDate = (value: string) =>
  dateFormatter.format(new Date(`${value}T00:00:00.000Z`)).toLowerCase()

const { data: allPosts } = await useAsyncData('home-posts', () =>
  queryCollection('blog').where('draft', '=', false).order('date', 'DESC').all()
)
const posts = computed(() => (allPosts.value ?? []).slice(0, 4))
const postCount = computed(() => allPosts.value?.length ?? 0)

// Now (real data)
const { data: nowEntry } = await useAsyncData('home-now', () =>
  queryCollection('now').where('draft', '=', false).order('date', 'DESC').first()
)
const monthFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC'
})
const nowMonthLabel = computed(() => {
  if (!nowEntry.value?.date) return ''
  return monthFormatter.format(new Date(`${nowEntry.value.date}T00:00:00.000Z`)).toLowerCase()
})

// Homelab status (live data when the D1-backed API has a recent push).
const emptyHomelabStatus = (): HomelabStatusResponse => ({
  data: null,
  nodes: [],
  services: [],
  history: [],
  updatedAt: null,
  fetchedAt: new Date(0).toISOString(),
  stale: true,
  unavailable: true,
  source: 'none'
})

const { data: homelabStatus, refresh: refreshHomelabStatus } = await useFetch<HomelabStatusResponse>('/api/status', {
  default: emptyHomelabStatus
})

// Currently — playing (Spotify)
const { data: spotifyData, refresh: refreshSpotify, status: spotifyStatus } = await useFetch('/api/spotify/now', {
  default: () => ({ playing: false, error: false, track: '', artist: '', url: '' })
})

// GitHub contributions
const { data: gitHubData, refresh: refreshGitHub } = await useFetch('/api/github/contributions', {
  default: () => ({ unavailable: true } as const)
})

// Live tick + clock — initialised on mount only to avoid hydration mismatch.
const tick = ref(0)
const clock = ref('--:--')
const mounted = ref(false)
let timer: ReturnType<typeof setInterval> | null = null
let homelabTimer: ReturnType<typeof setInterval> | null = null
let spotifyTimer: ReturnType<typeof setInterval> | null = null
let weatherTimer: ReturnType<typeof setInterval> | null = null
let gitHubTimer: ReturnType<typeof setInterval> | null = null

// Currently — weather (client-side, Open-Meteo)
const WMO: Record<number, string> = {
  0: 'clear',
  1: 'partly cloudy', 2: 'partly cloudy', 3: 'partly cloudy',
  45: 'fog', 48: 'fog',
  51: 'drizzle', 53: 'drizzle', 55: 'drizzle',
  61: 'rain', 63: 'rain', 65: 'rain',
  80: 'rain showers', 81: 'rain showers', 82: 'rain showers',
  95: 'thunderstorm', 96: 'thunderstorm', 99: 'thunderstorm'
}

const weatherData = ref<{ temp: string; condition: string; pm25: string } | null>(null)
const weatherLoaded = ref(false)

async function fetchWeather() {
  try {
    const [weatherRes, aqRes] = await Promise.all([
      fetch('https://api.open-meteo.com/v1/forecast?latitude=1.3521&longitude=103.8198&current=temperature_2m,weather_code,relative_humidity_2m'),
      fetch('https://air-quality-api.open-meteo.com/v1/air-quality?latitude=1.3521&longitude=103.8198&current=pm2_5')
    ])
    if (!weatherRes.ok || !aqRes.ok) throw new Error('weather fetch failed')
    const w = await weatherRes.json()
    const a = await aqRes.json()
    const code = w.current.weather_code as number
    const temp = Math.round(w.current.temperature_2m as number)
    const pm25 = Math.round(a.current.pm2_5 as number)
    weatherData.value = {
      temp: `${temp}°c`,
      condition: WMO[code] ?? 'unknown',
      pm25: `pm2.5 ${pm25}`
    }
    weatherLoaded.value = true
  } catch {
    weatherLoaded.value = true
  }
}

function pad2(n: number) { return n < 10 ? '0' + n : '' + n }
function formatNow() {
  const d = new Date()
  return pad2(d.getHours()) + ':' + pad2(d.getMinutes())
}

function formatDuration(seconds: number | undefined) {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds < 0) return 'unknown'
  const whole = Math.floor(seconds)
  const days = Math.floor(whole / 86400)
  const hours = Math.floor((whole % 86400) / 3600)
  const minutes = Math.floor((whole % 3600) / 60)
  if (days > 0) return `${days}d ${String(hours).padStart(2, '0')}h`
  if (hours > 0) return `${hours}h ${String(minutes).padStart(2, '0')}m`
  return `${minutes}m`
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

function formatKpiValue(value: number | null) {
  if (value === null) return '--'
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.?0+$/, '')
}

const homelabUnavailable = computed(() => homelabStatus.value?.unavailable ?? true)
const reportedNodes = computed(() => {
  const status = homelabStatus.value
  if (status?.nodes?.length) return status.nodes
  const data = status?.data
  if (!data) return []
  return [{
    ...data.node,
    kpis: data.kpis,
    services: data.services,
    history: status.history ?? [],
    updatedAt: status.updatedAt ?? status.fetchedAt,
    stale: status.stale
  }]
})
const reportedServices = computed(() => {
  if (homelabStatus.value?.services?.length) return homelabStatus.value.services
  const data = homelabStatus.value?.data
  if (!data) return []
  return data.services.map((service) => ({
    ...service,
    nodeId: data.node.id,
    nodeName: data.node.name
  }))
})

function canonicalNodeId(value: string) {
  if (value === 'homelab-v3' || value === 'ugreen-nas' || value === 'ugreen-dxp4800-plus' || value === 'dxp4800-plus') return 'nas'
  if (value === 'raspberry-pi-5' || value === 'raspberry-pi-5-8gb' || value === 'rpi5') return 'pi5'
  if (value === 'home-assistant-yellow' || value === 'yellow') return 'ha-yellow'
  return value
}

function canonicalServiceName(value: string) {
  return value.toLowerCase().replace(/[_\s]+/g, '-')
}

function nodeDisplayName(nodeId: string) {
  return DEFAULT_FLEET_NODES.find((node) => node.id === canonicalNodeId(nodeId))?.name ?? nodeId
}

function isDefaultFleetNodeId(nodeId: string) {
  const canonicalId = canonicalNodeId(nodeId)
  return DEFAULT_FLEET_NODES.some((node) => node.id === canonicalId)
}

function serviceDisplayName(name: string) {
  if (name === 'immich_server') return 'immich'
  if (name === 'home-assistant') return 'home assistant'
  return name.replace(/[_-]+/g, ' ')
}

function findReportedNode(defaultNode: typeof DEFAULT_FLEET_NODES[number]) {
  return reportedNodes.value.find((node) =>
    node.id === defaultNode.id || defaultNode.aliases.includes(node.id) || canonicalNodeId(node.id) === defaultNode.id
  )
}

function primaryKpiHistoryValues(node: HomelabStatusNode | undefined, key: HomelabKpiKey) {
  const history = node?.history?.length ? node.history : homelabStatus.value?.history ?? []
  return history
    .map((sample) => sample.kpis[key])
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
}

function metricChip(node: HomelabStatusNode | undefined, key: 'cpu' | 'mem' | 'temp') {
  const metric = node?.kpis.find((item) => item.key === key)
  const value = metric?.value ?? null
  const suffix = metric?.unit ?? (key === 'temp' ? 'C' : '%')
  return {
    key,
    label: key,
    value: value === null ? '--' : `${formatKpiValue(value)}${suffix}`,
    tone: metric?.tone ?? 'warn'
  }
}

function nodeTone(node: HomelabStatusNode | undefined) {
  if (!node) return 'warn'
  if (node.stale) return 'warn'
  if (node.kpis.some((metric) => metric.tone === 'bad')) return 'bad'
  if (node.kpis.some((metric) => metric.tone === 'warn')) return 'warn'
  return 'ok'
}

const primaryHomelabNode = computed(() => findReportedNode(PRIMARY_FLEET_NODE))

const primaryKpis = computed(() => {
  const source = primaryHomelabNode.value?.kpis?.length
    ? primaryHomelabNode.value.kpis
    : DEFAULT_PRIMARY_KPIS
  const byKey = new Map(source.map((kpi) => [kpi.key, kpi]))

  return PRIMARY_KPI_KEYS.map((key) => {
    const fallback = DEFAULT_PRIMARY_KPIS.find((kpi) => kpi.key === key)!
    const kpi = byKey.get(key) ?? fallback
    return {
      ...kpi,
      values: primaryKpiHistoryValues(primaryHomelabNode.value, key)
    }
  })
})

const fleetNodes = computed(() => {
  const used = new Set<string>()
  const defaults = DEFAULT_FLEET_NODES.map((defaultNode) => {
    const node = findReportedNode(defaultNode)
    if (node) used.add(node.id)
    const tone = nodeTone(node)
    return {
      id: defaultNode.id,
      sourceId: node?.id ?? defaultNode.id,
      name: defaultNode.name,
      role: node?.role || defaultNode.role,
      status: node ? node.stale ? 'stale' : 'live' : 'waiting',
      meta: node ? `${formatDuration(node.uptimeSeconds)} uptime` : 'no data yet',
      tone,
      chips: [
        metricChip(node, 'cpu'),
        metricChip(node, 'mem'),
        metricChip(node, 'temp')
      ]
    }
  })

  const extras = reportedNodes.value
    .filter((node) => !used.has(node.id) && !isDefaultFleetNodeId(node.id))
    .map((node) => ({
      id: node.id,
      sourceId: node.id,
      name: node.name,
      role: node.role || 'homelab node',
      status: node.stale ? 'stale' : 'live',
      meta: `${formatDuration(node.uptimeSeconds)} uptime`,
      tone: nodeTone(node),
      chips: [
        metricChip(node, 'cpu'),
        metricChip(node, 'mem'),
        metricChip(node, 'temp')
      ]
    }))

  return [...defaults, ...extras]
})

const normalNodes = computed(() => fleetNodes.value.filter((node) => !isDefaultFleetNodeId(node.id)))
const liveNodeCount = computed(() => fleetNodes.value.filter((node) => node.status === 'live').length)
const staleOrWaitingNodeCount = computed(() => fleetNodes.value.length - liveNodeCount.value)
const serviceRows = computed(() => {
  const actual = reportedServices.value
  const actualByKey = new Map(actual.map((service) => [
    `${canonicalNodeId(service.nodeId)}:${canonicalServiceName(service.name)}`,
    service
  ]))
  const used = new Set<string>()

  const rows = DEFAULT_FLEET_SERVICES.map((expected) => {
    const key = `${expected.nodeId}:${canonicalServiceName(expected.name)}`
    const actualService = actualByKey.get(key)
    if (actualService) used.add(`${canonicalNodeId(actualService.nodeId)}:${canonicalServiceName(actualService.name)}`)
    return actualService ?? {
      nodeId: expected.nodeId,
      nodeName: nodeDisplayName(expected.nodeId),
      name: expected.name,
      state: 'slow' as const,
      detail: 'waiting'
    }
  })

  const problemExtras = actual.filter((service) => {
    const key = `${canonicalNodeId(service.nodeId)}:${canonicalServiceName(service.name)}`
    return !used.has(key) && service.state !== 'up'
  })

  return [...rows, ...problemExtras]
})

const homelabPillTone = computed(() => {
  if (homelabUnavailable.value) return 'bad'
  if (serviceRows.value.some((service) => service.state === 'down') || fleetNodes.value.some((node) => node.tone === 'bad')) return 'bad'
  if (staleOrWaitingNodeCount.value > 0 || serviceRows.value.some((service) => service.state === 'slow')) return 'warn'
  return 'ok'
})
const homelabUptime = computed(() =>
  homelabUnavailable.value
    ? 'homelab n/a'
    : `homelab ${liveNodeCount.value}/${fleetNodes.value.length} live`
)
const homelabMeta = computed(() => {
  tick.value
  if (homelabUnavailable.value) return 'unavailable · no data'
  const total = fleetNodes.value.length
  if (liveNodeCount.value === total) return `live · ${total} nodes · updated ${timeAgo(homelabStatus.value?.updatedAt ?? null)}`
  if (liveNodeCount.value > 0) return `partial · ${liveNodeCount.value}/${total} live · updated ${timeAgo(homelabStatus.value?.updatedAt ?? null)}`
  return `stale · ${total} nodes · updated ${timeAgo(homelabStatus.value?.updatedAt ?? null)}`
})

// Currently — composed lines
const currentlyLines = computed(() => {
  const lines: Array<{ ic: string; lbl: string; val: string; url?: string }> = []

  if (spotifyData.value?.playing) {
    lines.push({
      ic: '▶',
      lbl: 'playing',
      val: `${spotifyData.value.artist} — ${spotifyData.value.track}`,
      url: spotifyData.value.url || undefined
    })
  } else {
    lines.push({
      ic: '▶',
      lbl: 'playing',
      val: spotifyData.value?.error
        ? 'unavailable'
        : `${SPOTIFY_FALLBACK.artist} — ${SPOTIFY_FALLBACK.track}`,
      url: spotifyData.value?.error ? undefined : (SPOTIFY_FALLBACK.url || undefined)
    })
  }

  if (readingEntry.value) {
    let val = readingEntry.value.book
    if (readingEntry.value.author) val += ` — ${readingEntry.value.author}`
    if (readingEntry.value.chapter) val += `, ${readingEntry.value.chapter}`
    lines.push({ ic: '📖', lbl: 'reading', val, url: readingEntry.value.link || undefined })
  }

  if (weatherData.value) {
    lines.push({
      ic: '☁',
      lbl: 'sg',
      val: `${weatherData.value.temp} · ${weatherData.value.condition} · ${weatherData.value.pm25}`
    })
  }

  lines.push({
    ic: '⏚',
    lbl: 'node',
    val: `${buildEnv.value.node} · bun ${buildEnv.value.bun} · ${buildEnv.value.os}`
  })

  return lines
})

const currentlyMeta = computed(() => {
  let n = 0
  if (spotifyStatus.value !== 'idle') n++
  if (readingEntry.value) n++
  if (weatherLoaded.value) n++
  n++ // node always connected
  return n >= 4 ? 'live' : `live · ${n}/4`
})

// GitHub heatmap cells
const gitHubCells = computed(() => {
  const d = gitHubData.value
  if (!d || 'unavailable' in d || !('weeks' in d)) return null
  const cells: Array<{ w: number; d: number; lvl: number }> = []
  for (let w = 0; w < d.weeks.length; w++) {
    for (let day = 0; day < d.weeks[w].length; day++) {
      cells.push({ w, d: day, lvl: d.weeks[w][day].level })
    }
  }
  return cells
})

const gitHubMeta = computed(() => {
  const d = gitHubData.value
  if (!d || 'unavailable' in d || !('totalContributions' in d)) {
    const err = d && 'error' in d ? d.error : 'no data'
    return `unavailable · ${err}`
  }
  const stale = 'stale' in d && (d as { stale?: boolean }).stale ? 'stale · ' : ''
  return `${stale}${d.totalContributions} contributions · streak ${d.streak}d`
})

// Terminal palette
const termOpen = ref(false)
const yieldsForTerm = computed(() => YIELDS.map(y => ({ name: y.name, val: y.val })))

function onKey(e: KeyboardEvent) {
  const tag = (e.target as HTMLElement | null)?.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA') {
    if (e.key === 'Escape') termOpen.value = false
    return
  }
  if (e.key === '`') { e.preventDefault(); termOpen.value = !termOpen.value }
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault()
    termOpen.value = !termOpen.value
  }
  if (e.key === 'Escape') termOpen.value = false
}

onMounted(() => {
  mounted.value = true
  clock.value = formatNow()
  timer = setInterval(() => {
    tick.value++
    clock.value = formatNow()
  }, 2000)
  refreshHomelabStatus()
  homelabTimer = setInterval(() => {
    refreshHomelabStatus()
  }, 30000)
  refreshSpotify()
  spotifyTimer = setInterval(() => {
    refreshSpotify()
  }, 30000)
  fetchWeather()
  weatherTimer = setInterval(() => {
    fetchWeather()
  }, 300000)
  refreshGitHub()
  gitHubTimer = setInterval(() => {
    refreshGitHub()
  }, 300000)
  window.addEventListener('keydown', onKey)
})

onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
  if (homelabTimer) clearInterval(homelabTimer)
  if (spotifyTimer) clearInterval(spotifyTimer)
  if (weatherTimer) clearInterval(weatherTimer)
  if (gitHubTimer) clearInterval(gitHubTimer)
  if (typeof window !== 'undefined') window.removeEventListener('keydown', onKey)
})
</script>

<template>
  <div class="home-shell">
    <!-- Header bar -->
    <header class="home-header">
      <div class="row gap-12">
        <div class="avatar">{{ NICK.initials }}</div>
        <div class="col" style="gap: 2px;">
          <div class="home-id-name">{{ NICK.name }}</div>
          <div class="home-id-sub">{{ NICK.role }} · {{ NICK.loc }}</div>
        </div>
      </div>
      <div class="row gap-6 wrap" style="justify-content: flex-end;">
        <HomePill tone="ok" :dot="true">online</HomePill>
        <HomePill :tone="homelabPillTone">{{ homelabUptime }}</HomePill>
        <HomePill>v2026.1</HomePill>
        <HomePill>{{ commitHash }}</HomePill>
        <ThemeToggle />
      </div>
    </header>

    <!-- Nav -->
    <nav class="home-nav" aria-label="Primary">
      <template v-for="(n, i) in NAV" :key="n.label">
        <NuxtLink
          v-if="n.href.startsWith('/')"
          :to="n.href"
          :class="n.on ? 'on' : ''"
        >{{ n.label }}</NuxtLink>
        <a v-else :href="n.href">{{ n.label }}</a>
        <span v-if="i < NAV.length - 1" class="sep">·</span>
      </template>
      <span class="sep">·</span>
      <a href="https://cv.nickczj.com" target="_blank" rel="noopener" style="color: var(--accent);">cv ↗</a>
      <span class="clock tnum">{{ clock }} sgt</span>
    </nav>

    <!-- Hero: homelab + now/about -->
    <div class="hero-grid">
      <section class="card">
        <div class="card-h">
          <div class="card-title homelab-card-title">
            <span class="dot" />
            <span>homelab.status</span>
            <span class="device-label">UGreen DXP4800 Plus NAS</span>
          </div>
          <div class="card-meta">{{ homelabMeta }}</div>
        </div>

        <div class="kpi-grid">
          <div
            v-for="k in primaryKpis"
            :key="k.key"
            :class="['kpi', k.tone === 'warn' ? 'warn' : '', k.tone === 'bad' ? 'bad' : '']"
          >
            <div class="kpi-label">
              <span>{{ k.label }}</span>
              <span class="dim3">{{ k.window }}</span>
            </div>
            <div class="kpi-value tnum">
              {{ formatKpiValue(k.value) }}<span v-if="k.value !== null && k.unit" class="unit">{{ k.unit }}</span>
            </div>
            <div class="kpi-spark">
              <HomeSpark
                :seed="k.key.length * 11"
                :h="22"
                :tone="k.tone === 'ok' ? '' : k.tone"
                :tick="tick"
                :values="k.values"
              />
            </div>
          </div>
        </div>

        <div v-if="normalNodes.length" class="node-grid">
          <div
            v-for="node in normalNodes"
            :key="node.sourceId"
            :class="['node-tile', node.tone === 'warn' ? 'warn' : '', node.tone === 'bad' ? 'bad' : '']"
          >
            <div class="node-tile-h">
              <span class="node-name">{{ node.name }}</span>
              <span class="node-status">{{ node.status }}</span>
            </div>
            <div class="node-role">{{ node.role }}</div>
            <div class="node-meta tnum">{{ node.meta }}</div>
            <div class="metric-chips">
              <span
                v-for="chip in node.chips"
                :key="chip.key"
                :class="['metric-chip', chip.tone === 'warn' ? 'warn' : '', chip.tone === 'bad' ? 'bad' : '']"
              >
                <span>{{ chip.label }}</span>
                <b class="tnum">{{ chip.value }}</b>
              </span>
            </div>
          </div>
        </div>

        <div class="svc-list">
          <div
            v-for="s in serviceRows"
            :key="`${s.nodeId}:${s.name}`"
            :class="['svc', s.state === 'slow' ? 'warn' : '', s.state === 'down' ? 'bad' : '']"
          >
            <div class="row gap-8">
              <span class="dot" />
              <span class="name">{{ nodeDisplayName(s.nodeId) }} / {{ serviceDisplayName(s.name) }}</span>
            </div>
            <span class="stat">
              {{ s.detail }}
            </span>
          </div>
        </div>
      </section>

      <div class="col gap-12">
        <section class="card">
          <div class="card-h">
            <div class="card-title">about</div>
            <div class="card-meta">{{ NICK.loc }} · utc+8</div>
          </div>
          <div class="tile" style="margin-bottom: 10px;">
            backend-leaning full-stack dev — <b>java, go, nuxt</b>. I build small infra and small finance tools, usually for myself, sometimes useful for others.
          </div>
          <a class="cv-link" href="https://cv.nickczj.com" target="_blank" rel="noopener">
            cv.nickczj.com <span style="font-size: 14px;">↗</span>
          </a>
        </section>

        <section class="card">
          <div class="card-h">
            <div class="card-title">/now{{ nowMonthLabel ? ' · ' + nowMonthLabel : '' }}</div>
            <div class="card-meta">latest</div>
          </div>
          <div class="tile serif">
            <template v-if="nowEntry?.summary">{{ nowEntry.summary }}</template>
            <template v-else>shipping <b>vesto v0.2</b>. reading <b>designing data-intensive applications</b>, ch. 7. planning the 1stack vpc migration.</template>
          </div>
          <div style="margin-top: 10px;">
            <NuxtLink to="/now" class="cv-link">read /now <span style="font-size: 14px;">→</span></NuxtLink>
          </div>
        </section>
      </div>
    </div>

    <!-- Three-col: projects · posts · yields -->
    <div class="three-col">
      <section id="projects" class="card">
        <div class="card-h">
          <div class="card-title">projects</div>
          <div class="card-meta">{{ PROJECTS.length }} active</div>
        </div>
        <div
          v-for="p in PROJECTS"
          :key="p.name"
          class="bar-row"
        >
          <div class="bar-h">
            <span>
              <b>{{ p.name }}</b>
              <span class="dim mono" style="font-size: 11px; margin-left: 6px;">{{ p.note }}</span>
            </span>
            <span class="meta">{{ p.tag }}</span>
          </div>
          <div class="bar-track">
            <div :class="['bar-fill', p.tone === 'warn' ? 'warn' : '']" :style="{ width: p.value + '%' }" />
          </div>
        </div>
      </section>

      <section class="card">
        <div class="card-h">
          <div class="card-title">latest posts</div>
          <div class="card-meta">
            <NuxtLink to="/blog">all {{ postCount ?? 0 }} →</NuxtLink>
          </div>
        </div>
        <template v-if="posts?.length">
          <NuxtLink
            v-for="p in posts"
            :key="p.path"
            :to="p.path"
            class="post"
            style="display: block;"
          >
            <div class="post-title">{{ p.title }}</div>
            <div class="post-meta">
              <span>{{ formatPostDate(p.date) }}</span>
              <span v-if="p.tags?.length" class="dim3">·</span>
              <span v-if="p.tags?.length" class="post-tag">{{ p.tags[0] }}</span>
            </div>
          </NuxtLink>
        </template>
        <div v-else class="tile">
          first posts are drafted in the repo — writing kicks off from real topics.
        </div>
      </section>

      <section class="card">
        <div class="card-h">
          <div class="card-title">sg yields</div>
          <div class="card-meta">demo snapshot</div>
        </div>
        <div
          v-for="y in YIELDS"
          :key="y.name"
          class="y-row"
        >
          <span class="name">{{ y.name }}</span>
          <span>
            <span class="val tnum">{{ y.val }}</span>
            <span v-if="y.dir" :class="['delta', y.dir === 'up' ? 'up' : 'down']">{{ y.delta }}</span>
          </span>
        </div>
        <div class="y-foot">
          <span class="live-dot" />
          <span>preview · vesto wiring soon</span>
        </div>
      </section>
    </div>

    <!-- Heatmap row: github + currently -->
    <div class="hm-row">
      <section class="card">
        <div class="card-h">
          <div class="card-title">github · last 12 months</div>
          <div class="card-meta">{{ gitHubMeta }}</div>
        </div>
        <HomeHeatmap :data="gitHubCells" :cell="10" :gap="3" />
        <div class="hm-legend">
          <span>less</span>
          <span class="swatches">
            <span class="sw" style="background: var(--bg-3);" />
            <span class="sw" style="background: color-mix(in srgb, var(--accent-2) 28%, var(--bg-3));" />
            <span class="sw" style="background: color-mix(in srgb, var(--accent-2) 55%, var(--bg-3));" />
            <span class="sw" style="background: color-mix(in srgb, var(--accent-2) 80%, var(--bg-3));" />
            <span class="sw" style="background: var(--accent-2);" />
          </span>
          <span>more</span>
          <span style="margin-left: auto;">
            <a href="https://github.com/nickczj" target="_blank" rel="noopener">github.com/nickczj</a>
          </span>
        </div>
      </section>

      <section class="card">
        <div class="card-h">
          <div class="card-title">currently</div>
          <div class="card-meta">{{ currentlyMeta }}</div>
        </div>
        <div
          v-for="line in currentlyLines"
          :key="line.lbl"
          class="now-line"
        >
          <span class="ic">{{ line.ic }}</span>
          <span class="lbl">{{ line.lbl }}</span>
          <a v-if="line.url" :href="line.url" target="_blank" rel="noopener" class="val now-link">{{ line.val }}</a>
          <span v-else class="val">{{ line.val }}</span>
        </div>
      </section>
    </div>

    <!-- Footer -->
    <div class="home-footer">
      <div class="left">
        <span>press <span class="kbd" @click="termOpen = !termOpen">`</span> for terminal</span>
        <span>· <span class="kbd">⌘K</span> palette</span>
        <span>· esc to close</span>
      </div>
      <div>
        built with <b>nuxt 4</b> · <b>cf pages</b> · sg-east · <span class="dim2">© 2026 nick chow</span>
        · <NuxtLink to="/colophon">colophon</NuxtLink>
      </div>
    </div>

    <HomeTerminal
      :open="termOpen"
      :nav="NAV"
      :yields="yieldsForTerm"
      :homelab-status="homelabStatus"
      @close="termOpen = false"
    />
  </div>
</template>
