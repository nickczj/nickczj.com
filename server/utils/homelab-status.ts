export const HOMELAB_STATUS_TABLE = 'homelab_status_current'
export const HOMELAB_STATUS_ROW_ID = 1
export const HOMELAB_STALE_AFTER_MS = 3 * 60 * 1000
export const HOMELAB_HISTORY_LIMIT = 30

export const HOMELAB_KPI_KEYS = ['cpu', 'mem', 'temp', 'load'] as const
export const HOMELAB_SERVICE_STATUSES = ['ok', 'warn', 'down'] as const
export const HOMELAB_TONES = ['ok', 'warn', 'bad'] as const

export type HomelabKpiKey = typeof HOMELAB_KPI_KEYS[number]
export type HomelabServiceStatus = typeof HOMELAB_SERVICE_STATUSES[number]
export type HomelabTone = typeof HOMELAB_TONES[number]
export type HomelabStatusSource = 'd1' | 'memory' | 'none'

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
  status: HomelabServiceStatus
  detail: string
  uptimeSeconds?: number
}

export type HomelabStatusPayload = {
  version: 1
  node: {
    name: string
    uptimeSeconds: number
  }
  kpis: HomelabKpi[]
  services: HomelabService[]
}

export type HomelabHistorySample = {
  at: string
  kpis: Partial<Record<HomelabKpiKey, number | null>>
}

export type HomelabStatusSnapshot = {
  data: HomelabStatusPayload
  history: HomelabHistorySample[]
  reportedAt: string
  receivedAt: string
}

export type HomelabStatusResponse = {
  data: HomelabStatusPayload | null
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
  run: () => Promise<unknown>
}

export type HomelabD1Database = {
  prepare: (query: string) => D1PreparedStatement
}

type HomelabStatusRow = {
  payload_json: string
  history_json: string
  reported_at: string
  received_at: string
}

let memorySnapshot: HomelabStatusSnapshot | null = null

export function validateHomelabPayload(input: unknown): ValidationResult {
  if (!isRecord(input)) return invalid('payload must be an object')
  if (input.version !== 1) return invalid('version must be 1')

  if (!isRecord(input.node)) return invalid('node must be an object')
  const nodeName = cleanString(input.node.name, 64)
  const uptimeSeconds = cleanNonNegativeNumber(input.node.uptimeSeconds)
  if (!nodeName) return invalid('node.name is required')
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
    if (!isHomelabServiceStatus(rawService.status)) return invalid(`service ${name} status is invalid`)

    const detail = cleanString(rawService.detail, 80) || statusDetail(rawService.status)
    const uptime = rawService.uptimeSeconds === undefined
      ? undefined
      : cleanNonNegativeNumber(rawService.uptimeSeconds)
    if (uptime === null) return invalid(`service ${name} uptimeSeconds must be non-negative`)

    services.push({
      name,
      status: rawService.status,
      detail,
      ...(uptime === undefined ? {} : { uptimeSeconds: uptime })
    })
  }

  return {
    ok: true,
    value: {
      version: 1,
      node: { name: nodeName, uptimeSeconds },
      kpis,
      services
    }
  }
}

export function appendHistorySample(
  history: HomelabHistorySample[],
  payload: HomelabStatusPayload,
  at: string,
  limit = HOMELAB_HISTORY_LIMIT
) {
  const kpis: HomelabHistorySample['kpis'] = {}
  for (const kpi of payload.kpis) {
    kpis[kpi.key] = kpi.value
  }

  return [...history, { at, kpis }].slice(-limit)
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
      history: [],
      updatedAt: null,
      fetchedAt,
      stale: true,
      unavailable: true,
      source: 'none'
    }
  }

  const updatedAt = snapshot.reportedAt || snapshot.receivedAt
  const stale = now.getTime() - Date.parse(updatedAt) > HOMELAB_STALE_AFTER_MS

  return {
    data: snapshot.data,
    history: snapshot.history,
    updatedAt,
    fetchedAt,
    stale,
    unavailable: false,
    source
  }
}

export async function readHomelabSnapshotFromD1(db: HomelabD1Database) {
  const row = await db
    .prepare(`SELECT payload_json, history_json, reported_at, received_at FROM ${HOMELAB_STATUS_TABLE} WHERE id = ?1`)
    .bind(HOMELAB_STATUS_ROW_ID)
    .first<HomelabStatusRow>()

  if (!row) return null

  return rowToSnapshot(row)
}

export async function writeHomelabSnapshotToD1(
  db: HomelabD1Database,
  payload: HomelabStatusPayload,
  receivedAt = new Date()
) {
  const existing = await readHomelabSnapshotFromD1(db)
  const receivedAtIso = receivedAt.toISOString()
  const reportedAt = receivedAtIso
  const history = appendHistorySample(existing?.history ?? [], payload, reportedAt)

  await db
    .prepare(
      `INSERT INTO ${HOMELAB_STATUS_TABLE}
        (id, version, payload_json, history_json, reported_at, received_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6)
       ON CONFLICT(id) DO UPDATE SET
        version = excluded.version,
        payload_json = excluded.payload_json,
        history_json = excluded.history_json,
        reported_at = excluded.reported_at,
        received_at = excluded.received_at`
    )
    .bind(
      HOMELAB_STATUS_ROW_ID,
      payload.version,
      JSON.stringify(payload),
      JSON.stringify(history),
      reportedAt,
      receivedAtIso
    )
    .run()

  return { data: payload, history, reportedAt, receivedAt: receivedAtIso } satisfies HomelabStatusSnapshot
}

export function readHomelabSnapshotFromMemory() {
  return memorySnapshot
}

export function writeHomelabSnapshotToMemory(payload: HomelabStatusPayload, receivedAt = new Date()) {
  const receivedAtIso = receivedAt.toISOString()
  const reportedAt = receivedAtIso
  const history = appendHistorySample(memorySnapshot?.history ?? [], payload, reportedAt)
  memorySnapshot = { data: payload, history, reportedAt, receivedAt: receivedAtIso }
  return memorySnapshot
}

export function resetHomelabMemorySnapshot() {
  memorySnapshot = null
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

function rowToSnapshot(row: HomelabStatusRow): HomelabStatusSnapshot | null {
  try {
    const parsedPayload = validateHomelabPayload(JSON.parse(row.payload_json))
    if (!parsedPayload.ok) return null

    const parsedHistory = JSON.parse(row.history_json)
    const history = sanitizeHistory(parsedHistory)

    return {
      data: parsedPayload.value,
      history,
      reportedAt: row.reported_at,
      receivedAt: row.received_at
    }
  } catch {
    return null
  }
}

function sanitizeHistory(input: unknown): HomelabHistorySample[] {
  if (!Array.isArray(input)) return []

  return input.flatMap((sample): HomelabHistorySample[] => {
    if (!isRecord(sample)) return []
    const at = cleanString(sample.at, 32)
    if (!at || Number.isNaN(Date.parse(at)) || !isRecord(sample.kpis)) return []

    const kpis: HomelabHistorySample['kpis'] = {}
    for (const key of HOMELAB_KPI_KEYS) {
      const value = sample.kpis[key]
      if (value === null || value === undefined) {
        kpis[key] = null
      } else if (typeof value === 'number' && Number.isFinite(value)) {
        kpis[key] = value
      }
    }

    return [{ at, kpis }]
  }).slice(-HOMELAB_HISTORY_LIMIT)
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

function statusDetail(status: HomelabServiceStatus) {
  if (status === 'down') return 'down'
  if (status === 'warn') return 'warn'
  return 'up'
}

function cleanString(value: unknown, maxLength: number) {
  if (typeof value !== 'string') return ''
  return value.trim().slice(0, maxLength)
}

function cleanFiniteNumber(value: unknown) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  return Math.round(value * 100) / 100
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

function isHomelabServiceStatus(value: unknown): value is HomelabServiceStatus {
  return typeof value === 'string' && (HOMELAB_SERVICE_STATUSES as readonly string[]).includes(value)
}

function isHomelabTone(value: unknown): value is HomelabTone {
  return typeof value === 'string' && (HOMELAB_TONES as readonly string[]).includes(value)
}

function invalid(error: string): ValidationResult {
  return { ok: false, error }
}
