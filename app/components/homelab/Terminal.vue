<script setup lang="ts">
import '~/assets/dashboard.css'
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { formatDuration, type HomelabStatusResponse } from '#shared/homelab/types'
import { CV_URL, SITE_NAV } from '~/data/site-nav'
import { SG_YIELDS, SG_YIELDS_AS_OF } from '~/data/sg-yields'

// Terminal overlay. ` or Cmd/Ctrl+K toggles it from anywhere on the page,
// Esc closes it. Bind v-model:open to open it from a button too.
const props = defineProps<{
  homelabStatus?: HomelabStatusResponse | null
}>()

const open = defineModel<boolean>('open', { default: false })

useDashboardFonts()

const NAV = [
  { label: '~/home', href: '/' },
  ...SITE_NAV.map((item) => ({ label: item.label.toLowerCase(), href: item.to })),
  { label: 'colophon', href: '/colophon' }
]

type Line = { type: 'sys' | 'in' | 'out' | 'err'; text: string }

const lines = ref<Line[]>([
  { type: 'sys', text: 'nickczj.term — type help · esc to close' }
])
const input = ref('')
const inputEl = ref<HTMLInputElement | null>(null)

watch(open, async (isOpen) => {
  if (!isOpen) return
  await nextTick()
  inputEl.value?.focus()
})

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
      out = [...NAV.map((item) => item.label), 'cv ↗'].join('  ')
      break
    case 'cd': {
      if (!rest.length) { out = 'usage: cd <page>'; break }
      const target = rest[0]!.replace(/^~?\//, '')
      const match = NAV.find((item) => item.label.replace(/^~?\//, '') === target)
      if (match) {
        out = `→ ${match.href}`
        open.value = false
        navigateTo(match.href)
      } else {
        out = `cd: no such page: ${target}`
      }
      break
    }
    case 'whoami':
      out = 'nick chow · senior software engineer · singapore'
      break
    case 'cv':
      window.open(CV_URL, '_blank', 'noopener')
      out = 'opening cv.nickczj.com…'
      break
    case 'uptime':
      out = formatHomelabUptime()
      break
    case 'yields':
      out = [
        `${SG_YIELDS_AS_OF.toLowerCase()} snapshot · not live`,
        ...SG_YIELDS.map((y) => `${y.short.padEnd(12)} ${y.rate}`)
      ].join('\n')
      break
    case 'clear':
      lines.value = []
      input.value = ''
      return
    default:
      next.push({ type: 'err', text: `${head}: command not found. try \`help\`` })
      lines.value = next
      input.value = ''
      return
  }

  next.push({ type: 'out', text: out })
  lines.value = next
  input.value = ''
}

function formatHomelabUptime() {
  const status = props.homelabStatus
  if (!status?.data || status.unavailable) return 'homelab status unavailable'

  const nodes = status.nodes ?? []
  const services = status.services?.length ? status.services : status.data.services
  const down = services.filter((s) => s.state === 'down').length
  const slow = services.filter((s) => s.state === 'slow').length
  const serviceState =
    down > 0 ? `${down} down`
      : slow > 0 ? `${slow} slow`
        : 'all services nominal'
  const freshness = nodes.length
    ? `${nodes.filter((node) => !node.stale).length}/${nodes.length} nodes live`
    : status.stale ? 'stale' : 'live'

  return `homelab ${freshness} · ${serviceState} · primary ${status.data.node.name} ${formatDuration(status.data.node.uptimeSeconds)}`
}

function onInputKey(e: KeyboardEvent) {
  if (e.key === 'Enter') run(input.value)
  if (e.key === 'Escape') open.value = false
}

function onWindowKey(e: KeyboardEvent) {
  const target = e.target as HTMLElement | null
  if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable) {
    if (e.key === 'Escape') open.value = false
    return
  }
  if (e.key === '`' || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k')) {
    e.preventDefault()
    open.value = !open.value
    return
  }
  if (e.key === 'Escape') open.value = false
}

onMounted(() => window.addEventListener('keydown', onWindowKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onWindowKey))
</script>

<template>
  <div v-if="open" class="dash term-backdrop" @click="open = false">
    <div class="term" role="dialog" aria-modal="true" aria-label="Terminal" @click.stop>
      <div class="term-h">
        <div class="lights" aria-hidden="true"><span /><span /><span /></div>
        <span>nick@homelab — zsh</span>
        <button type="button" class="term-close" @click="open = false">esc to close</button>
      </div>
      <div class="term-body">
        <div
          v-for="(line, i) in lines"
          :key="i"
          :class="['term-line', line.type === 'err' ? 'err' : '']"
        >
          <template v-if="line.type === 'in'">
            <span class="term-prompt">~</span>
            <span class="term-dollar"> $ </span>
          </template>
          <span class="out">{{ line.text }}</span>
        </div>
      </div>
      <div class="term-input">
        <span class="term-prompt">~</span>
        <span class="term-dollar">$</span>
        <input
          ref="inputEl"
          v-model="input"
          aria-label="Command"
          spellcheck="false"
          autocomplete="off"
          autocapitalize="off"
          placeholder="try: help, yields, whoami, cv"
          @keydown="onInputKey"
        />
      </div>
    </div>
  </div>
</template>
