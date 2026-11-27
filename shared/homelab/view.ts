import {
  canonicalHomelabNodeId,
  formatDuration,
  type HomelabFleetService,
  type HomelabKpi,
  type HomelabKpiKey,
  type HomelabServiceState,
  type HomelabStatusNode,
  type HomelabStatusResponse,
  type HomelabTone
} from './types'

// Turns an /api/status response into what the homelab panel shows. Pure, so
// the tests can pin it down and any page can reuse it.
//
// The machines are listed here because they rarely change and give the panel
// friendly names. Services are not: the panel shows whatever the pushers
// report, so there is no second list to keep in sync.

export const HOMELAB_FLEET = [
  { id: 'nas', name: 'UGreen DXP4800 Plus NAS', role: 'storage + containers' },
  { id: 'pi5', name: 'Raspberry Pi 5, 8GB', role: 'pi-hole dns, edge services' },
  { id: 'ha-yellow', name: 'Home Assistant Yellow, CM5', role: 'smart home' }
] as const

/** The node whose metrics fill the big KPI tiles. */
export const HOMELAB_PRIMARY_NODE_ID = 'nas'

const PANEL_KPI_KEYS: HomelabKpiKey[] = ['cpu', 'mem', 'temp', 'load']
const CHIP_KPI_KEYS: HomelabKpiKey[] = ['cpu', 'mem', 'temp']

export type HomelabNodeStatus = 'live' | 'stale' | 'waiting'

export type HomelabPanelKpi = {
  key: HomelabKpiKey
  label: string
  window: string
  /** Formatted number, or '--' when there is no reading. */
  value: string
  /** Display unit, empty when there is no reading. */
  unit: string
  tone: HomelabTone
  history: number[]
}

export type HomelabPanelChip = {
  key: HomelabKpiKey
  label: string
  value: string
  tone: HomelabTone
}

export type HomelabPanelNode = {
  id: string
  name: string
  role: string
  status: HomelabNodeStatus
  meta: string
  tone: HomelabTone
  chips: HomelabPanelChip[]
}

export type HomelabPanelService = {
  key: string
  node: string
  name: string
  state: HomelabServiceState
  detail: string
  tone: HomelabTone
}

export type HomelabPanelView = {
  unavailable: boolean
  tone: HomelabTone
  summary: string
  liveNodes: number
  totalNodes: number
  primary: {
    name: string
    status: HomelabNodeStatus
    kpis: HomelabPanelKpi[]
  }
  /** Every node except the primary, known machines first. */
  nodes: HomelabPanelNode[]
  services: HomelabPanelService[]
}

export function emptyHomelabStatus(): HomelabStatusResponse {
  return {
    data: null,
    nodes: [],
    services: [],
    history: [],
    updatedAt: null,
    fetchedAt: new Date(0).toISOString(),
    stale: true,
    unavailable: true,
    source: 'none'
  }
}

export function formatKpiValue(value: number | null) {
  if (value === null) return '--'
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.?0+$/, '')
}

/** Pushers send temperatures as unit 'C'. */
export function displayUnit(unit: string) {
  return unit === 'C' ? '°C' : unit
}

export function timeAgo(value: string | null, now: number) {
  if (!value) return 'never'
  const ageMs = now - Date.parse(value)
  if (!Number.isFinite(ageMs) || ageMs < 0) return 'now'
  const seconds = Math.floor(ageMs / 1000)
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 48) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export function serviceDisplayName(name: string) {
  if (name === 'immich_server') return 'immich'
  return name.replace(/[_-]+/g, ' ')
}

export function buildHomelabView(
  status: HomelabStatusResponse | null | undefined,
  now: number
): HomelabPanelView {
  const unavailable = status?.unavailable ?? true
  const reported = reportedNodes(status)
  const byId = new Map(reported.map((node) => [canonicalHomelabNodeId(node.id), node]))

  const known = HOMELAB_FLEET.map((spec) => panelNode(spec.id, byId.get(spec.id), spec))
  const knownIds = new Set<string>(HOMELAB_FLEET.map((spec) => spec.id))
  const extras = [...byId.entries()]
    .filter(([id]) => !knownIds.has(id))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([id, node]) => panelNode(id, node))
  const allNodes = [...known, ...extras]

  const primaryNode = byId.get(HOMELAB_PRIMARY_NODE_ID)
  const primarySpec = HOMELAB_FLEET.find((spec) => spec.id === HOMELAB_PRIMARY_NODE_ID)!
  const services = panelServices(status, allNodes)

  const liveNodes = allNodes.filter((node) => node.status === 'live').length
  const totalNodes = allNodes.length

  return {
    unavailable,
    tone: overallTone(unavailable, allNodes, services),
    summary: summaryLine(unavailable, liveNodes, totalNodes, status?.updatedAt ?? null, now),
    liveNodes,
    totalNodes,
    primary: {
      name: primarySpec.name,
      status: nodeStatus(primaryNode),
      kpis: PANEL_KPI_KEYS.map((key) => panelKpi(primaryNode, key, status))
    },
    nodes: allNodes.filter((node) => node.id !== HOMELAB_PRIMARY_NODE_ID),
    services
  }
}

// Older single-node responses carry `data` without `nodes`.
function reportedNodes(status: HomelabStatusResponse | null | undefined): HomelabStatusNode[] {
  if (!status) return []
  if (status.nodes?.length) return status.nodes
  if (!status.data) return []
  return [{
    ...status.data.node,
    kpis: status.data.kpis,
    services: status.data.services,
    history: status.history ?? [],
    updatedAt: status.updatedAt ?? status.fetchedAt,
    stale: status.stale
  }]
}

function reportedServices(status: HomelabStatusResponse | null | undefined): HomelabFleetService[] {
  if (!status) return []
  if (status.services?.length) return status.services
  const data = status.data
  if (!data) return []
  return data.services.map((service) => ({ ...service, nodeId: data.node.id, nodeName: data.node.name }))
}

function nodeStatus(node: HomelabStatusNode | undefined): HomelabNodeStatus {
  if (!node) return 'waiting'
  return node.stale ? 'stale' : 'live'
}

function nodeTone(node: HomelabStatusNode | undefined): HomelabTone {
  if (!node || node.stale) return 'warn'
  if (node.kpis.some((kpi) => kpi.tone === 'bad')) return 'bad'
  if (node.kpis.some((kpi) => kpi.tone === 'warn')) return 'warn'
  return 'ok'
}

function findKpi(node: HomelabStatusNode | undefined, key: HomelabKpiKey): HomelabKpi | undefined {
  return node?.kpis.find((kpi) => kpi.key === key)
}

function fallbackUnit(key: HomelabKpiKey) {
  if (key === 'cpu' || key === 'mem') return '%'
  if (key === 'temp') return 'C'
  if (key === 'power') return 'W'
  return ''
}

function panelNode(
  id: string,
  node: HomelabStatusNode | undefined,
  spec?: { name: string; role: string }
): HomelabPanelNode {
  return {
    id,
    name: spec?.name ?? node?.name ?? id,
    role: node?.role || spec?.role || 'homelab node',
    status: nodeStatus(node),
    meta: node ? `${formatDuration(node.uptimeSeconds)} uptime` : 'no data yet',
    tone: nodeTone(node),
    chips: CHIP_KPI_KEYS.map((key) => {
      const kpi = findKpi(node, key)
      const value = kpi?.value ?? null
      return {
        key,
        label: key,
        value: value === null ? '--' : `${formatKpiValue(value)}${displayUnit(kpi?.unit ?? fallbackUnit(key))}`,
        tone: kpi?.tone ?? 'warn'
      }
    })
  }
}

function panelKpi(
  node: HomelabStatusNode | undefined,
  key: HomelabKpiKey,
  status: HomelabStatusResponse | null | undefined
): HomelabPanelKpi {
  const kpi = findKpi(node, key)
  const value = kpi?.value ?? null
  const samples = node?.history?.length ? node.history : node ? status?.history ?? [] : []

  return {
    key,
    label: kpi?.label ?? key,
    window: kpi?.window ?? '1m',
    value: formatKpiValue(value),
    unit: value === null ? '' : displayUnit(kpi?.unit ?? fallbackUnit(key)),
    tone: kpi?.tone ?? 'warn',
    history: samples
      .map((sample) => sample.kpis[key])
      .filter((reading): reading is number => typeof reading === 'number' && Number.isFinite(reading))
  }
}

function serviceTone(state: HomelabServiceState): HomelabTone {
  if (state === 'down') return 'bad'
  if (state === 'slow') return 'warn'
  return 'ok'
}

function panelServices(
  status: HomelabStatusResponse | null | undefined,
  nodes: HomelabPanelNode[]
): HomelabPanelService[] {
  const order = new Map(nodes.map((node, index) => [node.id, index]))
  const statusById = new Map(nodes.map((node) => [node.id, node.status]))

  return reportedServices(status)
    .map((service) => {
      const node = canonicalHomelabNodeId(service.nodeId)
      const name = serviceDisplayName(service.name)
      const fresh = statusById.get(node) === 'live'
      const tone = serviceTone(service.state)
      // A node that stopped pushing still has its last report on file. Mark
      // those rows stale rather than showing an old "up" as current.
      const detail = fresh ? service.detail : service.state === 'down' ? 'down, stale' : 'stale'
      return {
        key: `${node}:${service.name}`,
        node,
        name,
        state: service.state,
        detail,
        tone: fresh || tone === 'bad' ? tone : 'warn'
      }
    })
    .sort((a, b) =>
      (order.get(a.node) ?? order.size) - (order.get(b.node) ?? order.size)
      || a.node.localeCompare(b.node)
      || a.name.localeCompare(b.name)
    )
}

// Health of the fleet as a whole: is everything reporting and up? A warm
// reading already colours its own tile, so it does not change this.
function overallTone(
  unavailable: boolean,
  nodes: HomelabPanelNode[],
  services: HomelabPanelService[]
): HomelabTone {
  if (unavailable) return 'bad'
  if (nodes.some((node) => node.tone === 'bad') || services.some((service) => service.tone === 'bad')) return 'bad'
  if (nodes.some((node) => node.status !== 'live') || services.some((service) => service.tone === 'warn')) return 'warn'
  return 'ok'
}

function summaryLine(
  unavailable: boolean,
  live: number,
  total: number,
  updatedAt: string | null,
  now: number
) {
  if (unavailable) return 'unavailable · no data'
  const updated = `updated ${timeAgo(updatedAt, now)}`
  if (live === total) return `live · ${total} nodes · ${updated}`
  if (live > 0) return `partial · ${live}/${total} live · ${updated}`
  return `stale · ${total} nodes · ${updated}`
}
