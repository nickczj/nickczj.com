import {
  HOMELAB_STALE_AFTER_MS,
  type HomelabFleetService,
  type HomelabHistorySample,
  type HomelabKpi,
  type HomelabKpiKey,
  type HomelabService,
  type HomelabStatusNode,
  type HomelabStatusPayload,
  type HomelabStatusResponse
} from './homelab-status'

export const HOMELAB_FIXTURE_MODES = ['fleet', 'partial', 'stale', 'down'] as const
export type HomelabFixtureMode = typeof HOMELAB_FIXTURE_MODES[number]

type FixtureNodeInput = {
  id: string
  name: string
  role: string
  uptimeSeconds: number
  ageSeconds: number
  kpis: Record<'cpu' | 'mem' | 'temp' | 'load', number>
  services: HomelabService[]
}

export function isHomelabFixtureMode(value: unknown): value is HomelabFixtureMode {
  return typeof value === 'string' && (HOMELAB_FIXTURE_MODES as readonly string[]).includes(value)
}

export function buildHomelabFixtureResponse(mode: HomelabFixtureMode = 'fleet', now = new Date()): HomelabStatusResponse {
  const nodes = fixtureNodes(mode, now)
  const primary = nodes.find((node) => node.id === 'nas') ?? nodes[0]!
  const services = fleetServices(nodes)
  const updatedAt = nodes
    .map((node) => node.updatedAt)
    .sort((a, b) => b.localeCompare(a))[0] ?? null

  return {
    data: payloadFromNode(primary),
    nodes,
    services,
    history: primary.history,
    updatedAt,
    fetchedAt: now.toISOString(),
    stale: nodes.every((node) => node.stale),
    unavailable: false,
    source: 'fixture'
  }
}

function fixtureNodes(mode: HomelabFixtureMode, now: Date): HomelabStatusNode[] {
  const base: FixtureNodeInput[] = [
    {
      id: 'nas',
      name: 'nas',
      role: 'storage + containers',
      uptimeSeconds: 31 * 86400 + 4 * 3600,
      ageSeconds: 42,
      kpis: { cpu: 12, mem: 54, temp: 42, load: 0.74 },
      services: [
        { name: 'immich_server', state: 'up', detail: 'up' },
        { name: 'paperless', state: 'up', detail: 'up' }
      ]
    },
    {
      id: 'pi5',
      name: 'pi5',
      role: 'pi-hole dns, edge services',
      uptimeSeconds: 18 * 86400 + 9 * 3600,
      ageSeconds: 55,
      kpis: { cpu: 8, mem: 31, temp: 48, load: 0.39 },
      services: [
        { name: 'pihole', state: 'up', detail: 'up' },
        { name: 'tailscale', state: 'up', detail: 'up' }
      ]
    },
    {
      id: 'ha-yellow',
      name: 'ha-yellow',
      role: 'smart home',
      uptimeSeconds: 9 * 86400 + 12 * 3600,
      ageSeconds: 68,
      kpis: { cpu: 5, mem: 39, temp: 45, load: 0.22 },
      services: [
        { name: 'home-assistant', state: 'up', detail: 'up' },
        { name: 'zigbee', state: 'up', detail: 'up' }
      ]
    }
  ]

  if (mode === 'partial') {
    base[2] = {
      ...base[2]!,
      ageSeconds: Math.ceil(HOMELAB_STALE_AFTER_MS / 1000) + 120,
      services: base[2]!.services.map((service) => ({ ...service, state: 'slow', detail: 'stale' }))
    }
  }

  if (mode === 'stale') {
    return base.map((node, index) => toStatusNode({
      ...node,
      ageSeconds: Math.ceil(HOMELAB_STALE_AFTER_MS / 1000) + 60 + index * 30
    }, now))
  }

  if (mode === 'down') {
    base[0] = {
      ...base[0]!,
      kpis: { cpu: 93, mem: 88, temp: 67, load: 6.4 },
      services: [
        { name: 'immich_server', state: 'down', detail: 'down' },
        { name: 'paperless', state: 'slow', detail: 'starting' }
      ]
    }
  }

  return base.map((node) => toStatusNode(node, now))
}

function toStatusNode(input: FixtureNodeInput, now: Date): HomelabStatusNode {
  const updatedAt = new Date(now.getTime() - input.ageSeconds * 1000).toISOString()
  const stale = now.getTime() - Date.parse(updatedAt) > HOMELAB_STALE_AFTER_MS

  return {
    id: input.id,
    name: input.name,
    role: input.role,
    uptimeSeconds: input.uptimeSeconds,
    kpis: [
      kpi('cpu', input.kpis.cpu, '%'),
      kpi('mem', input.kpis.mem, '%'),
      kpi('temp', input.kpis.temp, 'C'),
      kpi('load', input.kpis.load, '')
    ],
    services: input.services,
    history: history(input.kpis, now, input.ageSeconds),
    updatedAt,
    stale
  }
}

function kpi(key: HomelabKpiKey, value: number, unit: string): HomelabKpi {
  return {
    key,
    label: key,
    unit,
    value,
    window: '1m',
    tone: toneForKpi(key, value)
  }
}

function history(seed: FixtureNodeInput['kpis'], now: Date, ageSeconds: number): HomelabHistorySample[] {
  return Array.from({ length: 12 }, (_, index) => {
    const offset = (11 - index) * 30 + ageSeconds
    const wobble = Math.sin(index * 0.9)
    return {
      at: new Date(now.getTime() - offset * 1000).toISOString(),
      kpis: {
        cpu: round(Math.max(1, seed.cpu + wobble * 3)),
        mem: round(Math.max(1, seed.mem + Math.cos(index * 0.5) * 2)),
        temp: round(Math.max(1, seed.temp + wobble * 1.4)),
        load: round(Math.max(0, seed.load + wobble * 0.18))
      }
    }
  })
}

function fleetServices(nodes: HomelabStatusNode[]): HomelabFleetService[] {
  return nodes.flatMap((node) =>
    node.services.map((service) => ({
      ...service,
      nodeId: node.id,
      nodeName: node.name
    }))
  )
}

function payloadFromNode(node: HomelabStatusNode): HomelabStatusPayload {
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

function toneForKpi(key: HomelabKpiKey, value: number) {
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

function round(value: number) {
  return Math.round(value * 100) / 100
}
