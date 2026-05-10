export const HOMELAB_STALE_AFTER_MS = 3 * 60 * 1000
export const HOMELAB_HISTORY_LIMIT = 60
export const HOMELAB_RETENTION_SECONDS = 7 * 86400
export const HOMELAB_MAX_NODES = 8

export const HOMELAB_KPI_KEYS = ['cpu', 'mem', 'temp', 'power', 'load'] as const
export const HOMELAB_SERVICE_STATES = ['up', 'slow', 'down'] as const
export const HOMELAB_TONES = ['ok', 'warn', 'bad'] as const
export const HOMELAB_NODE_ALIASES: Record<string, string> = {
  'homelab-v3': 'nas',
  'ugreen-nas': 'nas',
  'ugreen-dxp4800-plus': 'nas',
  'dxp4800-plus': 'nas',
  'raspberry-pi-5': 'pi5',
  'raspberry-pi-5-8gb': 'pi5',
  rpi5: 'pi5',
  'home-assistant-yellow': 'ha-yellow',
  yellow: 'ha-yellow'
}

export type HomelabKpiKey = typeof HOMELAB_KPI_KEYS[number]
export type HomelabServiceState = typeof HOMELAB_SERVICE_STATES[number]
export type HomelabTone = typeof HOMELAB_TONES[number]
export type HomelabStatusSource = 'd1' | 'memory' | 'fixture' | 'none'

export type HomelabNode = {
  id: string
  name: string
  role: string
  uptimeSeconds: number
}

export type HomelabKpi = {
  key: HomelabKpiKey
  label: string
  unit: string
  value: number | null
  window: string
  tone: HomelabTone
}

export type HomelabService = {
  name: string
  state: HomelabServiceState
  detail: string
}

export type HomelabStatusPayload = {
  version: 1
  node: HomelabNode
  kpis: HomelabKpi[]
  services: HomelabService[]
}

export type HomelabHistorySample = {
  at: string
  kpis: Partial<Record<HomelabKpiKey, number | null>>
}

export type HomelabStatusNode = HomelabNode & {
  kpis: HomelabKpi[]
  services: HomelabService[]
  history: HomelabHistorySample[]
  updatedAt: string
  stale: boolean
}

export type HomelabFleetService = HomelabService & {
  nodeId: string
  nodeName: string
}

export type HomelabSnapshotNode = Omit<HomelabStatusNode, 'stale'>

export type HomelabStatusSnapshot = {
  data: HomelabStatusPayload
  nodes: HomelabSnapshotNode[]
  services: HomelabFleetService[]
  history: HomelabHistorySample[]
  reportedAt: string
  receivedAt: string
}

export type HomelabStatusResponse = {
  data: HomelabStatusPayload | null
  nodes: HomelabStatusNode[]
  services: HomelabFleetService[]
  history: HomelabHistorySample[]
  updatedAt: string | null
  fetchedAt: string
  stale: boolean
  unavailable: boolean
  source: HomelabStatusSource
}

type ValidationResult =
  | { ok: true; value: HomelabStatusPayload }
  | { ok: false; error: string }

type D1PreparedStatement = {
  bind: (...values: unknown[]) => D1PreparedStatement
  first: <T = unknown>() => Promise<T | null>
  all: <T = unknown>() => Promise<{ results?: T[] }>
  run: () => Promise<unknown>
}

export type HomelabD1Database = {
  prepare: (query: string) => D1PreparedStatement
  batch?: (statements: D1PreparedStatement[]) => Promise<unknown[]>
}

export type HomelabMetricRow = {
  ts: number
  node_id?: string
  cpu_pct: number | null
  mem_pct: number | null
  temp_c: number | null
  power_w: number | null
  load_1m: number | null
  meta_json: string
}

export type HomelabServiceRow = {
  ts: number
  node_id?: string
  service: string
  state: HomelabServiceState
}

type HomelabMetricRecord = {
  ts: number
  nodeId: string
  cpuPct: number | null
  memPct: number | null
  tempC: number | null
  powerW: number | null
  load1m: number | null
  metaJson: string
}

type HomelabServiceRecord = {
  ts: number
  nodeId: string
  service: string
  state: HomelabServiceState
}

type MetricMeta = {
  node: HomelabNode
  kpiMeta: Map<HomelabKpiKey, Partial<HomelabKpi>>
  serviceDetails: Map<string, string>
}

let memoryMetrics: HomelabMetricRecord[] = []
let memoryServices: HomelabServiceRecord[] = []

export function validateHomelabPayload(input: unknown): ValidationResult {
  if (!isRecord(input)) return invalid('payload must be an object')
  if (input.version !== 1) return invalid('version must be 1')

  if (!isRecord(input.node)) return invalid('node must be an object')
  const nodeName = cleanString(input.node.name, 64)
  const nodeId = cleanNodeId(input.node.id) || cleanNodeId(nodeName)
  const nodeRole = cleanString(input.node.role, 48)
  const uptimeSeconds = cleanNonNegativeNumber(input.node.uptimeSeconds)
  if (!nodeName) return invalid('node.name is required')
  if (!nodeId) return invalid('node.id is invalid')
  if (uptimeSeconds === null) return invalid('node.uptimeSeconds must be a non-negative number')

  if (!Array.isArray(input.kpis) || input.kpis.length < 1 || input.kpis.length > 8) {
    return invalid('kpis must contain 1-8 entries')
  }

  const seenKpis = new Set<string>()
  const kpis: HomelabKpi[] = []
  for (const rawKpi of input.kpis) {
    if (!isRecord(rawKpi)) return invalid('each kpi must be an object')
    const key = rawKpi.key
    if (!isHomelabKpiKey(key)) return invalid('kpi.key is invalid')
    if (seenKpis.has(key)) return invalid(`duplicate kpi key: ${key}`)
    seenKpis.add(key)

    const label = cleanString(rawKpi.label, 24)
    const unit = cleanString(rawKpi.unit, 8)
    const window = cleanString(rawKpi.window, 16)
    const value = rawKpi.value === null ? null : cleanFiniteNumber(rawKpi.value)
    const tone = isHomelabTone(rawKpi.tone) ? rawKpi.tone : toneForKpi(key, value)

    if (!label) return invalid(`kpi ${key} label is required`)
    if (!window) return invalid(`kpi ${key} window is required`)
    if (rawKpi.value !== null && value === null) return invalid(`kpi ${key} value must be a finite number or null`)

    kpis.push({ key, label, unit, value, window, tone })
  }

  if (!Array.isArray(input.services) || input.services.length > 20) {
    return invalid('services must contain 0-20 entries')
  }

  const services: HomelabService[] = []
  const seenServices = new Set<string>()
  for (const rawService of input.services) {
    if (!isRecord(rawService)) return invalid('each service must be an object')
    const name = cleanString(rawService.name, 48)
    if (!name) return invalid('service.name is required')
    if (seenServices.has(name)) return invalid(`duplicate service name: ${name}`)
    seenServices.add(name)

    const state = cleanServiceState(rawService.state ?? rawService.status)
    if (!state) return invalid(`service ${name} state is invalid`)

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

export function metricRowFromPayload(payload: HomelabStatusPayload, ts: number): HomelabMetricRecord {
  return {
    ts,
    nodeId: canonicalHomelabNodeId(payload.node.id),
    cpuPct: kpiValue(payload, 'cpu'),
    memPct: kpiValue(payload, 'mem'),
    tempC: kpiValue(payload, 'temp'),
    powerW: kpiValue(payload, 'power'),
    load1m: kpiValue(payload, 'load'),
    metaJson: JSON.stringify({
      version: payload.version,
      node: payload.node,
      kpis: payload.kpis.map(({ key, label, unit, window, tone }) => ({ key, label, unit, window, tone })),
      services: payload.services.map(({ name, detail }) => ({ name, detail }))
    })
  }
}

export function serviceRowsFromPayload(payload: HomelabStatusPayload, ts: number): HomelabServiceRecord[] {
  return payload.services.map((service) => ({
    ts,
    nodeId: canonicalHomelabNodeId(payload.node.id),
    service: service.name,
    state: service.state
  }))
}

export async function readHomelabSnapshotFromD1(db: HomelabD1Database) {
  const metricRows = await db
    .prepare(
      `SELECT ts, node_id, cpu_pct, mem_pct, temp_c, power_w, load_1m, meta_json
       FROM metrics
       ORDER BY ts DESC
       LIMIT ?1`
    )
    .bind(HOMELAB_HISTORY_LIMIT * HOMELAB_MAX_NODES)
    .all<HomelabMetricRow>()

  const metrics = (metricRows.results ?? []).map(metricRecordFromD1Row)
  if (!metrics.length) return null

  const serviceRows = await db
    .prepare(
      `SELECT s.ts, s.node_id, s.service, s.state
       FROM service_status s
       INNER JOIN (
        SELECT node_id, MAX(ts) AS ts
        FROM metrics
        GROUP BY node_id
       ) latest ON latest.node_id = s.node_id AND latest.ts = s.ts
       ORDER BY s.node_id ASC, s.service ASC`
    )
    .all<HomelabServiceRow>()

  return snapshotFromRows(metrics, (serviceRows.results ?? []).map(serviceRecordFromD1Row))
}

export async function writeHomelabSnapshotToD1(
  db: HomelabD1Database,
  payload: HomelabStatusPayload,
  receivedAt = new Date()
) {
  const ts = Math.floor(receivedAt.getTime() / 1000)
  const metric = metricRowFromPayload(payload, ts)
  const services = serviceRowsFromPayload(payload, ts)

  const statements = [
    db.prepare(
      `INSERT INTO metrics (ts, node_id, cpu_pct, mem_pct, temp_c, power_w, load_1m, meta_json)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
       ON CONFLICT(ts, node_id) DO UPDATE SET
        cpu_pct = excluded.cpu_pct,
        mem_pct = excluded.mem_pct,
        temp_c = excluded.temp_c,
        power_w = excluded.power_w,
        load_1m = excluded.load_1m,
        meta_json = excluded.meta_json`
    ).bind(metric.ts, metric.nodeId, metric.cpuPct, metric.memPct, metric.tempC, metric.powerW, metric.load1m, metric.metaJson),
    ...services.map((service) =>
      db.prepare(
        `INSERT INTO service_status (ts, node_id, service, state)
         VALUES (?1, ?2, ?3, ?4)
         ON CONFLICT(ts, node_id, service) DO UPDATE SET state = excluded.state`
      ).bind(service.ts, service.nodeId, service.service, service.state)
    )
  ]

  if (db.batch) {
    await db.batch(statements)
  } else {
    await Promise.all(statements.map((statement) => statement.run()))
  }

  await pruneHomelabRowsFromD1(db, ts - HOMELAB_RETENTION_SECONDS)

  const snapshot = snapshotFromRows([metric], services)
  if (!snapshot) throw new Error('failed to build homelab snapshot after write')
  return snapshot
}

export async function pruneHomelabRowsFromD1(db: HomelabD1Database, olderThanTs: number) {
  await Promise.all([
    db.prepare('DELETE FROM metrics WHERE ts < ?1').bind(olderThanTs).run(),
    db.prepare('DELETE FROM service_status WHERE ts < ?1').bind(olderThanTs).run()
  ])
}

export function readHomelabSnapshotFromMemory() {
  const metrics = [...memoryMetrics]
    .sort((a, b) => b.ts - a.ts)
    .slice(0, HOMELAB_HISTORY_LIMIT * HOMELAB_MAX_NODES)
  return snapshotFromRows(metrics, currentMemoryServices())
}

export function writeHomelabSnapshotToMemory(payload: HomelabStatusPayload, receivedAt = new Date()) {
  const ts = Math.floor(receivedAt.getTime() / 1000)
  const metric = metricRowFromPayload(payload, ts)
  memoryMetrics = upsertBy(memoryMetrics, metric, (row) => `${row.ts}:${row.nodeId}`)

  const nextServices = serviceRowsFromPayload(payload, ts)
  for (const service of nextServices) {
    memoryServices = upsertBy(memoryServices, service, (row) => `${row.ts}:${row.nodeId}:${row.service}`)
  }

  const cutoff = ts - HOMELAB_RETENTION_SECONDS
  memoryMetrics = memoryMetrics.filter((row) => row.ts >= cutoff)
  memoryServices = memoryServices.filter((row) => row.ts >= cutoff)

  const snapshot = snapshotFromRows([metric], nextServices)
  if (!snapshot) throw new Error('failed to build memory homelab snapshot after write')
  return snapshot
}

export function resetHomelabMemorySnapshot() {
  memoryMetrics = []
  memoryServices = []
}

export function buildHomelabResponse(
  snapshot: HomelabStatusSnapshot | null,
  source: HomelabStatusSource,
  now = new Date()
): HomelabStatusResponse {
  const fetchedAt = now.toISOString()
  if (!snapshot) {
    return {
      data: null,
      nodes: [],
      services: [],
      history: [],
      updatedAt: null,
      fetchedAt,
      stale: true,
      unavailable: true,
      source: 'none'
    }
  }

  const nodes = snapshot.nodes.map((node): HomelabStatusNode => ({
    ...node,
    stale: now.getTime() - Date.parse(node.updatedAt) > HOMELAB_STALE_AFTER_MS
  }))
  const primary = selectPrimaryNode(nodes)

  return {
    data: primary ? payloadFromNode(primary) : snapshot.data,
    nodes,
    services: nodes.flatMap((node) =>
      node.services.map((service) => ({
        ...service,
        nodeId: node.id,
        nodeName: node.name
      }))
    ),
    history: primary?.history ?? snapshot.history,
    updatedAt: snapshot.reportedAt,
    fetchedAt,
    stale: nodes.length === 0 || nodes.every((node) => node.stale),
    unavailable: false,
    source
  }
}

export function formatDuration(seconds: number | undefined) {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds < 0) return 'unknown'

  const whole = Math.floor(seconds)
  const days = Math.floor(whole / 86400)
  const hours = Math.floor((whole % 86400) / 3600)
  const minutes = Math.floor((whole % 3600) / 60)

  if (days > 0) return `${days}d ${String(hours).padStart(2, '0')}h`
  if (hours > 0) return `${hours}h ${String(minutes).padStart(2, '0')}m`
  return `${minutes}m`
}

function snapshotFromRows(metricsDesc: HomelabMetricRecord[], serviceRows: HomelabServiceRecord[]): HomelabStatusSnapshot | null {
  const sortedMetrics = [...metricsDesc].sort((a, b) => b.ts - a.ts)
  const latest = sortedMetrics[0]
  if (!latest) return null

  const metricsByNode = new Map<string, HomelabMetricRecord[]>()
  for (const metric of sortedMetrics) {
    const rows = metricsByNode.get(metric.nodeId) ?? []
    rows.push(metric)
    metricsByNode.set(metric.nodeId, rows)
  }

  const nodes = [...metricsByNode.entries()]
    .map(([nodeId, nodeMetricsDesc]) => nodeFromRows(nodeId, nodeMetricsDesc, serviceRows))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))

  const primary = selectPrimaryNode(nodes)
  if (!primary) return null
  const reportedAt = isoFromTs(latest.ts)

  return {
    data: payloadFromNode(primary),
    nodes,
    services: nodes.flatMap((node) =>
      node.services.map((service) => ({
        ...service,
        nodeId: node.id,
        nodeName: node.name
      }))
    ),
    history: primary.history,
    reportedAt,
    receivedAt: reportedAt
  }
}

function nodeFromRows(
  nodeId: string,
  nodeMetricsDesc: HomelabMetricRecord[],
  serviceRows: HomelabServiceRecord[]
): HomelabSnapshotNode {
  const latest = nodeMetricsDesc[0]!
  const meta = parseMetricMeta(latest.metaJson, nodeId)
  const services = latestServicesForNode(nodeId, serviceRows, meta)

  return {
    ...meta.node,
    id: nodeId,
    kpis: kpisFromMetric(latest, meta),
    services,
    history: [...nodeMetricsDesc].reverse().map(historySampleFromMetric),
    updatedAt: isoFromTs(latest.ts)
  }
}

function latestServicesForNode(nodeId: string, serviceRows: HomelabServiceRecord[], meta: MetricMeta) {
  const latestByName = new Map<string, HomelabServiceRecord>()
  for (const row of serviceRows) {
    if (row.nodeId !== nodeId) continue
    const current = latestByName.get(row.service)
    if (!current || row.ts > current.ts) latestByName.set(row.service, row)
  }

  return [...latestByName.values()]
    .sort((a, b) => a.service.localeCompare(b.service))
    .map((row): HomelabService => ({
      name: row.service,
      state: row.state,
      detail: meta.serviceDetails.get(row.service) ?? serviceDetail(row.state)
    }))
}

function payloadFromNode(node: HomelabSnapshotNode | HomelabStatusNode): HomelabStatusPayload {
  return {
    version: 1,
    node: {
      id: node.id,
      name: node.name,
      role: node.role,
      uptimeSeconds: node.uptimeSeconds
    },
    kpis: node.kpis,
    services: node.services
  }
}

function selectPrimaryNode<T extends HomelabSnapshotNode | HomelabStatusNode>(nodes: T[]) {
  return nodes.find((node) => canonicalHomelabNodeId(node.id) === 'nas')
    ?? nodes[0]
}

function kpisFromMetric(metric: HomelabMetricRecord, meta: MetricMeta): HomelabKpi[] {
  const labels = meta.kpiMeta
  return [
    kpiFromValue('cpu', metric.cpuPct, labels),
    kpiFromValue('mem', metric.memPct, labels),
    kpiFromValue('temp', metric.tempC, labels),
    kpiFromValue('load', metric.load1m, labels)
  ]
}

function kpiFromValue(key: HomelabKpiKey, value: number | null, labels: Map<HomelabKpiKey, Partial<HomelabKpi>>): HomelabKpi {
  const meta = labels.get(key)
  return {
    key,
    label: meta?.label ?? key,
    unit: meta?.unit ?? defaultKpiUnit(key),
    value,
    window: meta?.window ?? '1m',
    tone: meta?.tone ?? toneForKpi(key, value)
  }
}

function historySampleFromMetric(metric: HomelabMetricRecord): HomelabHistorySample {
  return {
    at: isoFromTs(metric.ts),
    kpis: {
      cpu: metric.cpuPct,
      mem: metric.memPct,
      temp: metric.tempC,
      power: metric.powerW,
      load: metric.load1m
    }
  }
}

function parseMetricMeta(value: string, fallbackNodeId: string): MetricMeta {
  const fallback: MetricMeta = {
    node: {
      id: fallbackNodeId,
      name: fallbackNodeId,
      role: '',
      uptimeSeconds: 0
    },
    kpiMeta: new Map(),
    serviceDetails: new Map()
  }

  try {
    const parsed = JSON.parse(value)
    if (!isRecord(parsed)) return fallback

    if (isRecord(parsed.node)) {
      const name = cleanString(parsed.node.name, 64)
      const id = cleanNodeId(parsed.node.id) || cleanNodeId(name) || fallback.node.id
      const role = cleanString(parsed.node.role, 48)
      const uptimeSeconds = cleanNonNegativeNumber(parsed.node.uptimeSeconds)
      fallback.node = {
        id,
        name: name || fallback.node.name,
        role,
        uptimeSeconds: uptimeSeconds ?? fallback.node.uptimeSeconds
      }
    }

    if (Array.isArray(parsed.kpis)) {
      for (const rawKpi of parsed.kpis) {
        if (!isRecord(rawKpi) || !isHomelabKpiKey(rawKpi.key)) continue
        fallback.kpiMeta.set(rawKpi.key, {
          label: cleanString(rawKpi.label, 24) || rawKpi.key,
          unit: cleanString(rawKpi.unit, 8),
          window: cleanString(rawKpi.window, 16) || '1m',
          tone: isHomelabTone(rawKpi.tone) ? rawKpi.tone : undefined
        })
      }
    }

    if (Array.isArray(parsed.services)) {
      for (const rawService of parsed.services) {
        if (!isRecord(rawService)) continue
        const name = cleanString(rawService.name, 48)
        const detail = cleanString(rawService.detail, 80)
        if (name && detail) fallback.serviceDetails.set(name, detail)
      }
    }

    return fallback
  } catch {
    return fallback
  }
}

function metricRecordFromD1Row(row: HomelabMetricRow): HomelabMetricRecord {
  const metaJson = row.meta_json || '{}'
  const nodeId = canonicalHomelabNodeId(cleanNodeId(row.node_id) || nodeIdFromMeta(metaJson))

  return {
    ts: row.ts,
    nodeId,
    cpuPct: cleanNullableNumber(row.cpu_pct),
    memPct: cleanNullableNumber(row.mem_pct),
    tempC: cleanNullableNumber(row.temp_c),
    powerW: cleanNullableNumber(row.power_w),
    load1m: cleanNullableNumber(row.load_1m),
    metaJson
  }
}

function serviceRecordFromD1Row(row: HomelabServiceRow): HomelabServiceRecord {
  return {
    ts: row.ts,
    nodeId: canonicalHomelabNodeId(cleanNodeId(row.node_id) || 'homelab'),
    service: row.service,
    state: cleanServiceState(row.state) ?? 'down'
  }
}

function currentMemoryServices() {
  const latest = new Map<string, HomelabServiceRecord>()
  for (const row of memoryServices) {
    const key = `${row.nodeId}:${row.service}`
    const current = latest.get(key)
    if (!current || row.ts > current.ts) latest.set(key, row)
  }
  return [...latest.values()]
}

function nodeIdFromMeta(value: string) {
  try {
    const parsed = JSON.parse(value)
    if (!isRecord(parsed) || !isRecord(parsed.node)) return 'homelab'
    return canonicalHomelabNodeId(cleanNodeId(parsed.node.id) || cleanNodeId(parsed.node.name) || 'homelab')
  } catch {
    return 'homelab'
  }
}

export function canonicalHomelabNodeId(value: string) {
  return HOMELAB_NODE_ALIASES[value] ?? value
}

function upsertBy<T>(rows: T[], row: T, keyFn: (row: T) => string) {
  const key = keyFn(row)
  return [...rows.filter((item) => keyFn(item) !== key), row]
}

function kpiValue(payload: HomelabStatusPayload, key: HomelabKpiKey) {
  return cleanNullableNumber(payload.kpis.find((kpi) => kpi.key === key)?.value)
}

function isoFromTs(ts: number) {
  return new Date(ts * 1000).toISOString()
}

function defaultKpiUnit(key: HomelabKpiKey) {
  if (key === 'cpu' || key === 'mem') return '%'
  if (key === 'temp') return 'C'
  if (key === 'power') return 'W'
  return ''
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

function serviceDetail(state: HomelabServiceState) {
  if (state === 'down') return 'down'
  if (state === 'slow') return 'slow'
  return 'up'
}

function cleanServiceState(value: unknown): HomelabServiceState | null {
  if (value === 'ok') return 'up'
  if (value === 'warn') return 'slow'
  if (typeof value !== 'string') return null
  return (HOMELAB_SERVICE_STATES as readonly string[]).includes(value) ? value as HomelabServiceState : null
}

function cleanString(value: unknown, maxLength: number) {
  if (typeof value !== 'string') return ''
  return value.trim().slice(0, maxLength)
}

function cleanNodeId(value: unknown) {
  return cleanString(value, 64)
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32)
}

function cleanFiniteNumber(value: unknown) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  return Math.round(value * 100) / 100
}

function cleanNullableNumber(value: unknown) {
  return value === null || value === undefined ? null : cleanFiniteNumber(value)
}

function cleanNonNegativeNumber(value: unknown) {
  const cleaned = cleanFiniteNumber(value)
  if (cleaned === null || cleaned < 0) return null
  return cleaned
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isHomelabKpiKey(value: unknown): value is HomelabKpiKey {
  return typeof value === 'string' && (HOMELAB_KPI_KEYS as readonly string[]).includes(value)
}

function isHomelabTone(value: unknown): value is HomelabTone {
  return typeof value === 'string' && (HOMELAB_TONES as readonly string[]).includes(value)
}

function invalid(error: string): ValidationResult {
  return { ok: false, error }
}
