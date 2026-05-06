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

type HomelabKpiKey = 'cpu' | 'mem' | 'temp' | 'load'
type HomelabTone = 'ok' | 'warn' | 'bad'
type HomelabServiceState = 'up' | 'slow' | 'down'
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
type HomelabStatusResponse = {
  data: {
    version: 1
    node: { name: string; uptimeSeconds: number }
    kpis: HomelabKpi[]
    services: HomelabService[]
  } | null
  history: HomelabHistorySample[]
  updatedAt: string | null
  fetchedAt: string
  stale: boolean
  unavailable: boolean
  source: 'd1' | 'memory' | 'none'
}

const DEFAULT_KPIS: HomelabKpi[] = [
  { key: 'cpu',  label: 'cpu',  unit: '%', value: null, window: '1m', tone: 'warn' },
  { key: 'mem',  label: 'mem',  unit: '%', value: null, window: '1m', tone: 'warn' },
  { key: 'temp', label: 'temp', unit: 'C', value: null, window: '1m', tone: 'warn' },
  { key: 'load', label: 'load', unit: '',  value: null, window: '1m', tone: 'warn' }
]

const DEFAULT_SERVICE_NAMES = [
  'traefik',
  'immich_server',
  'jellyfin',
  'suwayomi',
  'paperless',
  'beszel'
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
  default: () => ({ playing: false, error: false, track: '', artist: '' })
})

// Live tick + clock — initialised on mount only to avoid hydration mismatch.
const tick = ref(0)
const clock = ref('--:--')
const mounted = ref(false)
let timer: ReturnType<typeof setInterval> | null = null
let homelabTimer: ReturnType<typeof setInterval> | null = null
let spotifyTimer: ReturnType<typeof setInterval> | null = null
let weatherTimer: ReturnType<typeof setInterval> | null = null

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

const homelabData = computed(() => homelabStatus.value?.data ?? null)
const homelabHistory = computed(() => homelabStatus.value?.history ?? [])
const homelabUnavailable = computed(() => homelabStatus.value?.unavailable ?? true)
const homelabStale = computed(() => homelabStatus.value?.stale ?? true)
const homelabPillTone = computed(() => homelabUnavailable.value ? 'bad' : homelabStale.value ? 'warn' : 'ok')
const homelabUptime = computed(() =>
  homelabData.value ? `homelab ${formatDuration(homelabData.value.node.uptimeSeconds)}` : 'homelab n/a'
)
const homelabMeta = computed(() => {
  tick.value
  if (homelabUnavailable.value) return 'unavailable · no data'
  const prefix = homelabStale.value ? 'stale' : 'live'
  return `${prefix} · updated ${timeAgo(homelabStatus.value?.updatedAt ?? null)}`
})

const kpis = computed(() => {
  const source = homelabData.value?.kpis?.length ? homelabData.value.kpis : DEFAULT_KPIS
  return source.map((kpi) => ({
    ...kpi,
    values: homelabHistory.value
      .map((sample) => sample.kpis[kpi.key])
      .filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
  }))
})

const services = computed(() => homelabData.value?.services ?? DEFAULT_SERVICE_NAMES.map((name) => ({
  name,
  state: 'slow' as const,
  detail: 'waiting'
})))

// Currently — composed lines
const currentlyLines = computed(() => {
  const lines: Array<{ ic: string; lbl: string; val: string }> = []

  if (spotifyData.value?.playing) {
    lines.push({
      ic: '▶',
      lbl: 'playing',
      val: `${spotifyData.value.artist} — ${spotifyData.value.track}`
    })
  } else {
    lines.push({
      ic: '▶',
      lbl: 'playing',
      val: spotifyData.value?.error ? 'unavailable' : 'nothing playing'
    })
  }

  if (readingEntry.value) {
    let val = readingEntry.value.book
    if (readingEntry.value.author) val += ` — ${readingEntry.value.author}`
    if (readingEntry.value.chapter) val += `, ${readingEntry.value.chapter}`
    lines.push({ ic: '📖', lbl: 'reading', val })
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
  window.addEventListener('keydown', onKey)
})

onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
  if (homelabTimer) clearInterval(homelabTimer)
  if (spotifyTimer) clearInterval(spotifyTimer)
  if (weatherTimer) clearInterval(weatherTimer)
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
        <HomePill><span class="tnum">{{ clock }}</span> sgt</HomePill>
        <HomePill :tone="homelabPillTone">{{ homelabUptime }}</HomePill>
        <HomePill>v2026.1</HomePill>
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
          <div class="card-title"><span class="dot" /> homelab.status</div>
          <div class="card-meta">{{ homelabMeta }}</div>
        </div>

        <div class="kpi-grid">
          <div
            v-for="k in kpis"
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
              <HomeSpark :seed="k.key.length * 11" :h="22" :tone="k.tone === 'ok' ? '' : k.tone" :tick="tick" :values="k.values" />
            </div>
          </div>
        </div>

        <div class="svc-list">
          <div
            v-for="s in services"
            :key="s.name"
            :class="['svc', s.state === 'slow' ? 'warn' : '', s.state === 'down' ? 'bad' : '']"
          >
            <div class="row gap-8">
              <span class="dot" />
              <span class="name">{{ s.name }}</span>
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
          <div class="card-meta">demo · 847 commits · streak 14d</div>
        </div>
        <HomeHeatmap :seed="11" :cell="10" :gap="3" />
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
          <span class="val">{{ line.val }}</span>
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
