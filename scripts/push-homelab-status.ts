#!/usr/bin/env bun
import { execFile } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { cpus, freemem, hostname, loadavg, totalmem, uptime } from 'node:os'
import { promisify } from 'node:util'
import {
  type HomelabKpi,
  type HomelabService,
  type HomelabStatusPayload,
  validateHomelabPayload
} from '../server/utils/homelab-status'

const execFileAsync = promisify(execFile)

const DEFAULT_SERVICES = [
  'traefik',
  'grafana',
  'home-assistant',
  'jellyfin',
  'vesto-dev',
  'cf-tunnel'
]

type CpuStat = {
  idle: number
  total: number
}

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

  console.log(`pushed homelab status to ${endpoint}`)
}

export async function collectHomelabStatus(): Promise<HomelabStatusPayload> {
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
      name: process.env.HOMELAB_NODE_NAME || hostname(),
      uptimeSeconds
    },
    kpis,
    services
  }
}

export async function collectCpuPercent() {
  const first = parseCpuStat(await readOptionalFile('/proc/stat')) ?? readOsCpuStat()
  await new Promise((resolve) => setTimeout(resolve, 250))
  const second = parseCpuStat(await readOptionalFile('/proc/stat')) ?? readOsCpuStat()
  if (!first || !second) return null

  const idleDelta = second.idle - first.idle
  const totalDelta = second.total - first.total
  if (totalDelta <= 0) return null

  return round((1 - idleDelta / totalDelta) * 100)
}

export async function collectMemoryPercent() {
  return parseMemoryPercent(await readOptionalFile('/proc/meminfo')) ?? memoryPercentFromBytes(totalmem(), freemem())
}

export async function collectLoadAverage() {
  return parseLoadAverage(await readOptionalFile('/proc/loadavg')) ?? round(loadavg()[0] ?? 0)
}

export async function collectUptimeSeconds() {
  return parseUptimeSeconds(await readOptionalFile('/proc/uptime')) ?? round(uptime())
}

export async function collectTemperature() {
  const output = await tryExec('sensors', ['-j'], 1500)
  if (!output) return null
  return parseSensorsTemperature(output)
}

export async function collectDockerServices(names: string[]) {
  if (!names.length) return []

  return Promise.all(names.map(inspectDockerService))
}

export function parseCpuStat(input: string): CpuStat | null {
  if (!input) return null

  const line = input.split('\n').find((entry) => entry.startsWith('cpu '))
  if (!line) return null

  const values = line.trim().split(/\s+/).slice(1).map(Number)
  if (values.some((value) => !Number.isFinite(value))) return null

  const idle = (values[3] ?? 0) + (values[4] ?? 0)
  const total = values.reduce((sum, value) => sum + value, 0)
  return { idle, total }
}

export function parseMemoryPercent(input: string) {
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

export function parseLoadAverage(input: string) {
  if (!input) return null

  const value = Number(input.trim().split(/\s+/)[0])
  return Number.isFinite(value) ? round(value) : null
}

export function parseUptimeSeconds(input: string) {
  if (!input) return null

  const value = Number(input.trim().split(/\s+/)[0])
  return Number.isFinite(value) && value >= 0 ? round(value) : 0
}

export function parseSensorsTemperature(input: string) {
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

export function parseDockerInspect(output: string, expectedNames: string[]): HomelabService[] {
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

function normalizeContainerName(value: unknown) {
  return typeof value === 'string' ? value.replace(/^\//, '') : ''
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  })
}
