import { describe, expect, test } from 'bun:test'
import { buildHomelabFixtureResponse } from '../server/utils/homelab-status-fixtures'
import type { HomelabStatusNode, HomelabStatusResponse } from '../shared/homelab/types'
import {
  buildHomelabView,
  displayUnit,
  emptyHomelabStatus,
  formatKpiValue,
  serviceDisplayName,
  timeAgo
} from '../shared/homelab/view'

const NOW = new Date('2026-11-27T07:00:00.000Z')
const NOW_MS = NOW.getTime()

function serviceLabels(status: HomelabStatusResponse) {
  return buildHomelabView(status, NOW_MS).services.map((service) => `${service.node}/${service.name}`)
}

describe('buildHomelabView', () => {
  test('with no data, every known machine waits and nothing is invented', () => {
    const view = buildHomelabView(emptyHomelabStatus(), NOW_MS)

    expect(view.unavailable).toBe(true)
    expect(view.tone).toBe('bad')
    expect(view.summary).toBe('unavailable · no data')
    expect(view.liveNodes).toBe(0)
    expect(view.totalNodes).toBe(3)
    expect(view.primary.status).toBe('waiting')
    expect(view.primary.kpis.map((kpi) => kpi.value)).toEqual(['--', '--', '--', '--'])
    expect(view.primary.kpis.every((kpi) => kpi.unit === '' && kpi.history.length === 0)).toBe(true)
    expect(view.nodes.map((node) => [node.id, node.status, node.meta])).toEqual([
      ['pi5', 'waiting', 'no data yet'],
      ['ha-yellow', 'waiting', 'no data yet']
    ])
    expect(view.services).toEqual([])
  })

  test('a healthy fleet reads live, with the NAS in the big tiles', () => {
    const view = buildHomelabView(buildHomelabFixtureResponse('fleet', NOW), NOW_MS)

    expect(view.unavailable).toBe(false)
    expect(view.tone).toBe('ok')
    expect(view.summary).toBe('live · 3 nodes · updated 42s ago')
    expect(view.primary.name).toBe('UGreen DXP4800 Plus NAS')
    expect(view.primary.kpis.map((kpi) => `${kpi.label}=${kpi.value}${kpi.unit}`)).toEqual([
      'cpu=12%',
      'mem=54%',
      'temp=42°C',
      'load=0.74'
    ])
    expect(view.primary.kpis[0]!.history).toHaveLength(12)
    expect(view.nodes.map((node) => node.name)).toEqual(['Raspberry Pi 5, 8GB', 'Home Assistant Yellow, CM5'])
    expect(view.nodes[0]!.chips.map((chip) => chip.value)).toEqual(['8%', '31%', '48°C'])
  })

  test('shows only the services the pushers report, in machine order', () => {
    expect(serviceLabels(buildHomelabFixtureResponse('fleet', NOW))).toEqual([
      'nas/immich',
      'nas/paperless',
      'nas/tailscale',
      'pi5/pihole',
      'pi5/tailscale',
      'ha-yellow/tailscale'
    ])

    const status = buildHomelabFixtureResponse('fleet', NOW)
    status.services = status.services.filter((service) => service.name !== 'pihole')
    expect(serviceLabels(status)).not.toContain('pi5/pihole')
  })

  test('a node that stopped pushing is stale, and so are its services', () => {
    const view = buildHomelabView(buildHomelabFixtureResponse('partial', NOW), NOW_MS)

    expect(view.summary).toBe('partial · 2/3 live · updated 42s ago')
    expect(view.tone).toBe('warn')
    const yellow = view.nodes.find((node) => node.id === 'ha-yellow')!
    expect(yellow.status).toBe('stale')
    expect(yellow.tone).toBe('warn')
    const yellowService = view.services.find((service) => service.node === 'ha-yellow')!
    expect(yellowService.detail).toBe('stale')
    expect(yellowService.tone).toBe('warn')
  })

  test('a stale up service is not shown as current', () => {
    const status = buildHomelabFixtureResponse('stale', NOW)
    const view = buildHomelabView(status, NOW_MS)

    expect(view.summary).toBe('stale · 3 nodes · updated 4m ago')
    expect(view.liveNodes).toBe(0)
    expect(view.services.every((service) => service.detail === 'stale' && service.tone === 'warn')).toBe(true)
  })

  test('down services and hot metrics turn the panel bad', () => {
    const view = buildHomelabView(buildHomelabFixtureResponse('down', NOW), NOW_MS)

    expect(view.tone).toBe('bad')
    expect(view.primary.kpis.find((kpi) => kpi.key === 'cpu')).toMatchObject({ value: '93', tone: 'bad' })
    expect(view.services.find((service) => service.name === 'immich')).toMatchObject({ detail: 'down', tone: 'bad' })
    expect(view.services.find((service) => service.name === 'paperless')).toMatchObject({ detail: 'starting', tone: 'warn' })
  })

  test('a warm reading colours its node but not the fleet', () => {
    const status = buildHomelabFixtureResponse('fleet', NOW)
    const yellow = status.nodes.find((node) => node.id === 'ha-yellow')!
    yellow.kpis = yellow.kpis.map((kpi) => kpi.key === 'temp' ? { ...kpi, value: 66, tone: 'warn' } : kpi)

    const view = buildHomelabView(status, NOW_MS)
    expect(view.nodes.find((node) => node.id === 'ha-yellow')!.tone).toBe('warn')
    expect(view.tone).toBe('ok')
  })

  test('reads older single-node responses and aliased node ids', () => {
    const fleet = buildHomelabFixtureResponse('fleet', NOW)
    const nas = fleet.nodes.find((node) => node.id === 'nas')!
    const legacy: HomelabStatusResponse = {
      ...fleet,
      nodes: [],
      services: [],
      data: {
        version: 1,
        node: { id: 'homelab-v3', name: 'homelab-v3', role: '', uptimeSeconds: 3600 },
        kpis: nas.kpis,
        services: [{ name: 'immich_server', state: 'up', detail: 'up' }]
      },
      stale: false
    }

    const view = buildHomelabView(legacy, NOW_MS)
    expect(view.primary.status).toBe('live')
    expect(view.primary.kpis[0]!.value).toBe('12')
    expect(view.services.map((service) => `${service.node}/${service.name}`)).toEqual(['nas/immich'])
  })

  test('machines it does not know about are listed after the known ones', () => {
    const status = buildHomelabFixtureResponse('fleet', NOW)
    const extra: HomelabStatusNode = {
      ...status.nodes[0]!,
      id: 'mac-mini',
      name: 'Mac mini',
      role: '',
      services: [{ name: 'omlx', state: 'up', detail: 'up' }]
    }
    status.nodes.push(extra)
    status.services.push({ name: 'omlx', state: 'up', detail: 'up', nodeId: 'mac-mini', nodeName: 'Mac mini' })

    const view = buildHomelabView(status, NOW_MS)
    expect(view.nodes.map((node) => node.id)).toEqual(['pi5', 'ha-yellow', 'mac-mini'])
    expect(view.nodes[2]).toMatchObject({ name: 'Mac mini', role: 'homelab node' })
    expect(view.totalNodes).toBe(4)
    expect(view.services.at(-1)).toMatchObject({ node: 'mac-mini', name: 'omlx' })
  })
})

describe('formatting helpers', () => {
  test('timeAgo', () => {
    expect(timeAgo(null, NOW_MS)).toBe('never')
    expect(timeAgo('2026-11-27T07:00:05.000Z', NOW_MS)).toBe('now')
    expect(timeAgo('2026-11-27T06:59:15.000Z', NOW_MS)).toBe('45s ago')
    expect(timeAgo('2026-11-27T06:30:00.000Z', NOW_MS)).toBe('30m ago')
    expect(timeAgo('2026-11-26T08:00:00.000Z', NOW_MS)).toBe('23h ago')
    expect(timeAgo('2026-11-24T07:00:00.000Z', NOW_MS)).toBe('3d ago')
  })

  test('formatKpiValue keeps at most two decimals', () => {
    expect(formatKpiValue(null)).toBe('--')
    expect(formatKpiValue(12)).toBe('12')
    expect(formatKpiValue(0.5)).toBe('0.5')
    expect(formatKpiValue(37.271)).toBe('37.27')
  })

  test('units and service names', () => {
    expect(displayUnit('C')).toBe('°C')
    expect(displayUnit('%')).toBe('%')
    expect(serviceDisplayName('immich_server')).toBe('immich')
    expect(serviceDisplayName('home-assistant')).toBe('home assistant')
    expect(serviceDisplayName('bento-pdf')).toBe('bento pdf')
  })
})
