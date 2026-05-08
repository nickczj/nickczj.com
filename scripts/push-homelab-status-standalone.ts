#!/usr/bin/env bun
// Self-contained homelab status pusher — drop this on any Linux host with Bun.
// No dependencies on the rest of the repo.
import { execFile } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { cpus, freemem, hostname, loadavg, totalmem, uptime } from 'node:os'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

// ── Types ──────────────────────────────────────────────────────────────────

const HOMELAB_KPI_KEYS = ['cpu', 'mem', 'temp', 'power', 'load'] as const
const HOMELAB_SERVICE_STATES = ['up', 'slow', 'down'] as const
const HOMELAB_TONES = ['ok', 'warn', 'bad'] as const

type HomelabKpiKey = typeof HOMELAB_KPI_KEYS[number]
type HomelabServiceState = typeof HOMELAB_SERVICE_STATES[number]
type HomelabTone = typeof HOMELAB_TONES[number]

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

type HomelabStatusPayload = {
  version: 1
  node: {
    id: string
    name: string
    role: string
    uptimeSeconds: number
  }
  kpis: HomelabKpi[]
  services: HomelabService[]
}

type ValidationResult =
  | { ok: true; value: HomelabStatusPayload }
  | { ok: false; error: string }

// ── Validation (inlined from server/utils/homelab-status.ts) ───────────────

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function cleanString(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') return ''
  return value.trim().slice(0, maxLength)
}

function cleanNodeId(value: unknown): string {
  return cleanString(value, 64)
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32)
}

function cleanFiniteNumber(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  return Math.round(value * 100) / 100
}

function cleanNonNegativeNumber(value: unknown): number | null {
  const cleaned = cleanFiniteNumber(value)
  if (cleaned === null || cleaned < 0) return null
  return cleaned
}

function isHomelabKpiKey(value: unknown): value is HomelabKpiKey {
  return typeof value === 'string' && (HOMELAB_KPI_KEYS as readonly string[]).includes(value)
}

function isHomelabTone(value: unknown): value is HomelabTone {
  return typeof value === 'string' && (HOMELAB_TONES as readonly string[]).includes(value)
}

function cleanServiceState(value: unknown): HomelabServiceState | null {
  if (value === 'ok') return 'up'
  if (value === 'warn') return 'slow'
  if (typeof value !== 'string') return null
  return (HOMELAB_SERVICE_STATES as readonly string[]).includes(value) ? value as HomelabServiceState : null
}

function serviceDetail(state: HomelabServiceState): string {
  if (state === 'down') return 'down'
  if (state === 'slow') return 'slow'
  return 'up'
}

function toneForKpi(key: HomelabKpiKey, value: number | null): HomelabTone {
  if (value === null) return 'warn'
  if (key === 'cpu' || key === 'mem') {
    if (value >= 90) return 'bad'
    if (value >= 75) return 'warn'
  }
  if (key === 'temp') {
    if (value >= 80) return 'bad'
    if (value >= 65) return 'warn'
  }
  if (key === 'load') {
    if (value >= 8) return 'bad'
    if (value >= 4) return 'warn'
  }
  return 'ok'
}

function validateHomelabPayload(input: unknown): ValidationResult {
  if (!isRecord(input)) return { ok: false, error: 'payload must be an object' }
  if (input.version !== 1) return { ok: false, error: 'version must be 1' }

  if (!isRecord(input.node)) return { ok: false, error: 'node must be an object' }
  const nodeName = cleanString(input.node.name, 64)
  const nodeId = cleanNodeId(input.node.id) || cleanNodeId(nodeName)
  const nodeRole = cleanString(input.node.role, 48)
  const uptimeSeconds = cleanNonNegativeNumber(input.node.uptimeSeconds)
  if (!nodeName) return { ok: false, error: 'node.name is required' }
  if (!nodeId) return { ok: false, error: 'node.id is invalid' }
  if (uptimeSeconds === null) return { ok: false, error: 'node.uptimeSeconds must be a non-negative number' }

  if (!Array.isArray(input.kpis) || input.kpis.length < 1 || input.kpis.length > 8) {
    return { ok: false, error: 'kpis must contain 1-8 entries' }
  }

  const seenKpis = new Set<string>()
  const kpis: HomelabKpi[] = []
  for (const rawKpi of input.kpis) {
    if (!isRecord(rawKpi)) return { ok: false, error: 'each kpi must be an object' }
    const key = rawKpi.key
    if (!isHomelabKpiKey(key)) return { ok: false, error: 'kpi.key is invalid' }
    if (seenKpis.has(key)) return { ok: false, error: `duplicate kpi key: ${key}` }
    seenKpis.add(key)

    const label = cleanString(rawKpi.label, 24)
    const unit = cleanString(rawKpi.unit, 8)
    const window = cleanString(rawKpi.window, 16)
    const value = rawKpi.value === null ? null : cleanFiniteNumber(rawKpi.value)
    const tone = isHomelabTone(rawKpi.tone) ? rawKpi.tone : toneForKpi(key, value)

    if (!label) return { ok: false, error: `kpi ${key} label is required` }
    if (!window) return { ok: false, error: `kpi ${key} window is required` }
    if (rawKpi.value !== null && value === null) return { ok: false, error: `kpi ${key} value must be a finite number or null` }

    kpis.push({ key, label, unit, value, window, tone })
  }

  if (!Array.isArray(input.services) || input.services.length > 20) {
    return { ok: false, error: 'services must contain 0-20 entries' }
  }

  const services: HomelabService[] = []
  const seenServices = new Set<string>()
  for (const rawService of input.services) {
    if (!isRecord(rawService)) return { ok: false, error: 'each service must be an object' }
    const name = cleanString(rawService.name, 48)
    if (!name) return { ok: false, error: 'service.name is required' }
    if (seenServices.has(name)) return { ok: false, error: `duplicate service name: ${name}` }
    seenServices.add(name)

    const state = cleanServiceState(rawService.state ?? rawService.status)
    if (!state) return { ok: false, error: `service ${name} state is invalid` }

    services.push({
      name,
      state,
      detail: cleanString(rawService.detail, 80) || serviceDetail(state)
    })
  }

  return {
    ok: true,
    value: {
      version: 1,
      node: { id: nodeId, name: nodeName, role: nodeRole, uptimeSeconds },
      kpis,
      services
    }
  }
}

// ── Collectors ──────────────────────────────────────────────────────────────

const DEFAULT_SERVICES = [
  'traefik',
  'immich_server',
  'jellyfin',
  'suwayomi',
  'paperless',
  'beszel'
]

type CpuStat = { idle: number; total: number }

async function main() {
  const payload = await collectHomelabStatus()
  const validated = validateHomelabPayload(payload)
  if (!validated.ok) {
    throw new Error(`collector produced invalid payload: ${validated.error}`)
  }

  if (process.env.HOMELAB_DRY_RUN === '1') {
    console.log(JSON.stringify(validated.value, null, 2))
    return
  }

  const endpoint = requireEnv('HOMELAB_STATUS_ENDPOINT')
  const token = requireEnv('HOMELAB_STATUS_TOKEN')

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify(validated.value)
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`status push failed: ${response.status} ${response.statusText}${text ? ` - ${text}` : ''}`)
  }

  const result = await response.json().catch(() => null)
  const source = isRecord(result) && typeof result.source === 'string' ? ` (${result.source})` : ''
  console.log(`pushed homelab status to ${endpoint}${source}`)
}

async function collectHomelabStatus(): Promise<HomelabStatusPayload> {
  const [cpu, mem, temp, load, uptimeSeconds, services] = await Promise.all([
    collectCpuPercent(),
    collectMemoryPercent(),
    collectTemperature(),
    collectLoadAverage(),
    collectUptimeSeconds(),
    collectDockerServices(getServiceNames())
  ])

  const kpis: HomelabKpi[] = [
    { key: 'cpu', label: 'cpu', unit: '%', value: cpu, window: '1m', tone: toneForPercent(cpu) },
    { key: 'mem', label: 'mem', unit: '%', value: mem, window: '1m', tone: toneForPercent(mem) },
    { key: 'temp', label: 'temp', unit: 'C', value: temp, window: '1m', tone: toneForTemp(temp) },
    { key: 'load', label: 'load', unit: '', value: load, window: '1m', tone: toneForLoad(load) }
  ]

  return {
    version: 1,
    node: {
      id: nodeId(),
      name: nodeName(),
      role: process.env.HOMELAB_NODE_ROLE || '',
      uptimeSeconds
    },
    kpis,
    services
  }
}

async function collectCpuPercent() {
  const first = parseCpuStat(await readOptionalFile('/proc/stat')) ?? readOsCpuStat()
  await new Promise((resolve) => setTimeout(resolve, 250))
  const second = parseCpuStat(await readOptionalFile('/proc/stat')) ?? readOsCpuStat()
  if (!first || !second) return null

  const idleDelta = second.idle - first.idle
  const totalDelta = second.total - first.total
  if (totalDelta <= 0) return null

  return round((1 - idleDelta / totalDelta) * 100)
}

async function collectMemoryPercent() {
  return parseMemoryPercent(await readOptionalFile('/proc/meminfo')) ?? memoryPercentFromBytes(totalmem(), freemem())
}

async function collectLoadAverage() {
  return parseLoadAverage(await readOptionalFile('/proc/loadavg')) ?? round(loadavg()[0] ?? 0)
}

async function collectUptimeSeconds() {
  return parseUptimeSeconds(await readOptionalFile('/proc/uptime')) ?? round(uptime())
}

async function collectTemperature() {
  const output = await tryExec('sensors', ['-j'], 1500)
  if (!output) return null
  return parseSensorsTemperature(output)
}

async function collectDockerServices(names: string[]) {
  if (!names.length) return []
  return Promise.all(names.map(inspectDockerService))
}

function parseCpuStat(input: string): CpuStat | null {
  if (!input) return null

  const line = input.split('\n').find((entry) => entry.startsWith('cpu '))
  if (!line) return null

  const values = line.trim().split(/\s+/).slice(1).map(Number)
  if (values.some((value) => !Number.isFinite(value))) return null

  const idle = (values[3] ?? 0) + (values[4] ?? 0)
  const total = values.reduce((sum, value) => sum + value, 0)
  return { idle, total }
}

function parseMemoryPercent(input: string) {
  if (!input) return null

  const values = new Map<string, number>()
  for (const line of input.split('\n')) {
    const match = line.match(/^(\w+):\s+(\d+)/)
    if (match) values.set(match[1]!, Number(match[2]))
  }

  const total = values.get('MemTotal')
  const available = values.get('MemAvailable')
  if (!total || available === undefined || total <= 0) return null

  return round(((total - available) / total) * 100)
}

function parseLoadAverage(input: string) {
  if (!input) return null

  const value = Number(input.trim().split(/\s+/)[0])
  return Number.isFinite(value) ? round(value) : null
}

function parseUptimeSeconds(input: string) {
  if (!input) return null

  const value = Number(input.trim().split(/\s+/)[0])
  return Number.isFinite(value) && value >= 0 ? round(value) : 0
}

function parseSensorsTemperature(input: string) {
  try {
    const parsed = JSON.parse(input)
    const readings: number[] = []
    collectTemperatureReadings(parsed, readings)
    if (!readings.length) return null
    return round(Math.max(...readings))
  } catch {
    return null
  }
}

function parseDockerInspect(output: string, expectedNames: string[]): HomelabService[] {
  const byName = new Map<string, HomelabService>()

  for (const line of output.split('\n')) {
    if (!line.trim()) continue
    try {
      const container = JSON.parse(line)
      const name = normalizeContainerName(container.Name)
      if (!name) continue
      byName.set(name, serviceFromContainer(name, container))
    } catch {
      continue
    }
  }

  return expectedNames.map((name) => byName.get(name) ?? {
    name,
    state: 'down',
    detail: 'not found'
  })
}

async function inspectDockerService(name: string): Promise<HomelabService> {
  try {
    const { stdout } = await execFileAsync('docker', ['inspect', '--format', '{{json .}}', name], {
      timeout: 3000,
      maxBuffer: 1024 * 1024
    })
    return parseDockerInspect(stdout, [name])[0] ?? { name, state: 'down', detail: 'not found' }
  } catch (error) {
    const stderr = error instanceof Error && 'stderr' in error ? String(error.stderr) : ''
    if (stderr.includes('No such object')) {
      return { name, state: 'down', detail: 'not found' }
    }
    return { name, state: 'slow', detail: 'docker unavailable' }
  }
}

function serviceFromContainer(name: string, container: Record<string, unknown>): HomelabService {
  const state = isRecord(container.State) ? container.State : {}
  const health = isRecord(state.Health) ? state.Health : null
  const running = state.Running === true
  const healthStatus = typeof health?.Status === 'string' ? health.Status : ''

  if (!running) {
    return { name, state: 'down', detail: 'down' }
  }

  if (healthStatus === 'unhealthy') {
    return { name, state: 'down', detail: 'unhealthy' }
  }

  if (healthStatus === 'starting') {
    return { name, state: 'slow', detail: 'starting' }
  }

  return { name, state: 'up', detail: 'up' }
}

function collectTemperatureReadings(value: unknown, readings: number[]) {
  if (typeof value === 'number' && Number.isFinite(value)) return
  if (!isRecord(value)) return

  for (const [key, nested] of Object.entries(value)) {
    if (/temp\d+_input$/.test(key) && typeof nested === 'number' && Number.isFinite(nested)) {
      readings.push(nested)
      continue
    }
    if (isRecord(nested)) collectTemperatureReadings(nested, readings)
  }
}

async function tryExec(command: string, args: string[], timeout: number) {
  try {
    const { stdout } = await execFileAsync(command, args, { timeout, maxBuffer: 1024 * 1024 })
    return stdout
  } catch {
    return ''
  }
}

async function readOptionalFile(path: string) {
  try {
    return await readFile(path, 'utf8')
  } catch {
    return ''
  }
}

function readOsCpuStat(): CpuStat | null {
  const stats = cpus()
  if (!stats.length) return null

  return stats.reduce<CpuStat>((sum, cpu) => {
    const times = cpu.times
    return {
      idle: sum.idle + times.idle,
      total: sum.total + times.user + times.nice + times.sys + times.idle + times.irq
    }
  }, { idle: 0, total: 0 })
}

function memoryPercentFromBytes(total: number, free: number) {
  if (!Number.isFinite(total) || !Number.isFinite(free) || total <= 0) return null
  return round(((total - free) / total) * 100)
}

function getServiceNames() {
  return (process.env.HOMELAB_DOCKER_SERVICES || DEFAULT_SERVICES.join(','))
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean)
}

function nodeName() {
  return process.env.HOMELAB_NODE_NAME || hostname()
}

function nodeId() {
  return normalizeNodeId(process.env.HOMELAB_NODE_ID || nodeName())
}

function normalizeContainerName(value: unknown) {
  return typeof value === 'string' ? value.replace(/^\//, '') : ''
}

function normalizeNodeId(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32) || 'homelab'
}

function toneForPercent(value: number | null) {
  if (value === null) return 'warn'
  if (value >= 90) return 'bad'
  if (value >= 75) return 'warn'
  return 'ok'
}

function toneForTemp(value: number | null) {
  if (value === null) return 'warn'
  if (value >= 80) return 'bad'
  if (value >= 65) return 'warn'
  return 'ok'
}

function toneForLoad(value: number | null) {
  if (value === null) return 'warn'
  if (value >= 8) return 'bad'
  if (value >= 4) return 'warn'
  return 'ok'
}

function requireEnv(key: string) {
  const value = process.env[key]
  if (!value) throw new Error(`${key} is required`)
  return value
}

function round(value: number) {
  return Math.round(value * 100) / 100
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  })
}
