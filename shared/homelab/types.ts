// Wire types for /api/status. The server builds these, the app renders them,
// and both import from here. Server-only storage types stay in
// server/utils/homelab-status.ts.

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

export function canonicalHomelabNodeId(value: string) {
  return HOMELAB_NODE_ALIASES[value] ?? value
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
