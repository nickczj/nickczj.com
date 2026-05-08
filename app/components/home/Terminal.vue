<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'

const props = defineProps<{
  open: boolean
  nav: { label: string; href: string }[]
  yields: { name: string; val: string }[]
  homelabStatus?: {
    data: {
      node: { name: string; uptimeSeconds: number }
      services: { state: 'up' | 'slow' | 'down' }[]
    } | null
    nodes?: {
      id: string
      name: string
      uptimeSeconds: number
      stale: boolean
      services: { state: 'up' | 'slow' | 'down' }[]
    }[]
    services?: { state: 'up' | 'slow' | 'down' }[]
    stale: boolean
    unavailable: boolean
    updatedAt: string | null
  } | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

type Line = { type: 'sys' | 'in' | 'out' | 'err'; text: string }

const lines = ref<Line[]>([
  { type: 'sys', text: 'nickczj.term — type help · esc to close' }
])
const val = ref('')
const inputEl = ref<HTMLInputElement | null>(null)

watch(() => props.open, async (isOpen) => {
  if (!isOpen) return
  await nextTick()
  setTimeout(() => inputEl.value?.focus(), 30)
})

const NAME = 'nick chow'
const ROLE = 'senior software engineer'
const LOC  = 'singapore'

function run(raw: string) {
  const cmd = raw.trim()
  if (!cmd) return
  const next: Line[] = [...lines.value, { type: 'in', text: cmd }]
  const [head, ...rest] = cmd.split(/\s+/)
  let out = ''

  switch (head) {
    case 'help':
      out = [
        'commands:',
        '  ls          list pages',
        '  cd <page>   navigate',
        '  whoami      print bio',
        '  cv          open cv.nickczj.com',
        '  uptime      homelab uptime',
        '  yields      sg yields snapshot',
        '  clear       clear screen'
      ].join('\n')
      break
    case 'ls':
      out = props.nav.map(n => n.label).concat(['cv ↗']).join('  ')
      break
    case 'cd': {
      if (!rest.length) { out = 'usage: cd <page>'; break }
      const target = rest[0]!.replace(/^~?\//, '')
      const match = props.nav.find(n => n.label.replace(/^~?\//, '') === target)
      if (match && match.href.startsWith('/')) {
        if (typeof window !== 'undefined') window.location.assign(match.href)
        out = `→ ${match.href}`
      } else {
        out = `→ /${target}`
      }
      break
    }
    case 'whoami':
      out = `${NAME} · ${ROLE} · ${LOC}`
      break
    case 'cv':
      if (typeof window !== 'undefined') window.open('https://cv.nickczj.com', '_blank')
      out = 'opening cv.nickczj.com…'
      break
    case 'uptime':
      out = formatHomelabUptime()
      break
    case 'yields':
      out = props.yields.map(y => `${y.name.padEnd(12)} ${y.val}`).join('\n')
      break
    case 'clear':
      lines.value = []
      val.value = ''
      return
    default:
      next.push({ type: 'err', text: `${head}: command not found. try \`help\`` })
      lines.value = next
      val.value = ''
      return
  }

  next.push({ type: 'out', text: out })
  lines.value = next
  val.value = ''
}

function formatHomelabUptime() {
  const status = props.homelabStatus
  if (!status?.data || status.unavailable) return 'homelab status unavailable'

  const nodes = status.nodes ?? []
  const services = status.services?.length ? status.services : status.data.services
  const down = services.filter(s => s.state === 'down').length
  const slow = services.filter(s => s.state === 'slow').length
  const serviceState =
    down > 0 ? `${down} down` :
    slow > 0 ? `${slow} slow` :
    'all services nominal'
  const freshness = nodes.length
    ? `${nodes.filter((node) => !node.stale).length}/${nodes.length} nodes live`
    : status.stale ? 'stale' : 'live'

  return `homelab ${freshness} · ${serviceState} · primary ${status.data.node.name} ${formatDuration(status.data.node.uptimeSeconds)}`
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

function onKey(e: KeyboardEvent) {
  if (e.key === 'Enter') run(val.value)
  if (e.key === 'Escape') emit('close')
}
</script>

<template>
  <div v-if="open" class="term-backdrop" @click="emit('close')">
    <div class="term" @click.stop>
      <div class="term-h">
        <div class="lights"><span /><span /><span /></div>
        <span>nick@homelab — zsh</span>
        <span style="margin-left: auto; color: var(--ink-3);">esc to close</span>
      </div>
      <div class="term-body">
        <div
          v-for="(l, i) in lines"
          :key="i"
          :class="['term-line', l.type === 'err' ? 'err' : '']"
        >
          <template v-if="l.type === 'in'">
            <span style="color: var(--accent);">~</span>
            <span style="color: var(--ink-3);"> $ </span>
          </template>
          <span class="out">{{ l.text }}</span>
        </div>
      </div>
      <div class="term-input">
        <span class="prompt">~</span>
        <span class="dim2">$</span>
        <input
          ref="inputEl"
          v-model="val"
          spellcheck="false"
          autocomplete="off"
          placeholder="try: help, yields, whoami, cv"
          @keydown="onKey"
        />
      </div>
    </div>
  </div>
</template>
