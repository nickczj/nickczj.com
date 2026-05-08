import { describe, expect, test } from 'bun:test'
import {
  buildHomelabResponse,
  type HomelabD1Database,
  type HomelabMetricRow,
  type HomelabServiceRow,
  type HomelabStatusPayload,
  readHomelabSnapshotFromD1,
  readHomelabSnapshotFromMemory,
  resetHomelabMemorySnapshot,
  validateHomelabPayload,
  writeHomelabSnapshotToD1,
  writeHomelabSnapshotToMemory
} from '../server/utils/homelab-status'

const payload: HomelabStatusPayload = {
  version: 1,
  node: { id: 'nas', name: 'homelab-v3', role: 'storage + containers', uptimeSeconds: 123456 },
  kpis: [
    { key: 'cpu', label: 'cpu', unit: '%', value: 23.456, window: '1m', tone: 'ok' },
    { key: 'mem', label: 'mem', unit: '%', value: 70, window: '1m', tone: 'ok' },
    { key: 'temp', label: 'temp', unit: 'C', value: null, window: '1m', tone: 'warn' },
    { key: 'load', label: 'load', unit: '', value: 1.23, window: '1m', tone: 'ok' }
  ],
  services: [
    { name: 'traefik', state: 'up', detail: 'up' },
    { name: 'jellyfin', state: 'slow', detail: 'starting' }
  ]
}

describe('homelab status validation', () => {
  test('accepts and sanitizes a valid payload', () => {
    const result = validateHomelabPayload(payload)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.node.id).toBe('nas')
      expect(result.value.kpis[0]?.value).toBe(23.46)
      expect(result.value.services[0]?.state).toBe('up')
    }
  })

  test('accepts legacy node payloads without id and role', () => {
    const result = validateHomelabPayload({
      ...payload,
      node: { name: 'HomeLab V3', uptimeSeconds: 123 }
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.node.id).toBe('homelab-v3')
      expect(result.value.node.role).toBe('')
    }
  })

  test('accepts legacy service status names as aliases', () => {
    const result = validateHomelabPayload({
      ...payload,
      services: [
        { name: 'traefik', status: 'ok', detail: 'up' },
        { name: 'jellyfin', status: 'warn', detail: 'starting' }
      ]
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.services.map((service) => service.state)).toEqual(['up', 'slow'])
    }
  })

  test('rejects invalid versions and duplicate services', () => {
    expect(validateHomelabPayload({ ...payload, version: 2 }).ok).toBe(false)
    expect(validateHomelabPayload({
      ...payload,
      services: [
        { name: 'traefik', state: 'up', detail: 'up' },
        { name: 'traefik', state: 'up', detail: 'up' }
      ]
    }).ok).toBe(false)
  })
})

describe('homelab status structured storage', () => {
  test('marks old snapshots stale', () => {
    resetHomelabMemorySnapshot()
    const snapshot = writeHomelabSnapshotToMemory(payload, new Date('2026-05-05T00:00:00.000Z'))
    const response = buildHomelabResponse(snapshot, 'memory', new Date('2026-05-05T00:04:00.000Z'))

    expect(response.stale).toBe(true)
    expect(response.unavailable).toBe(false)
  })

  test('memory fallback appends metric history and tracks current service state', () => {
    resetHomelabMemorySnapshot()
    writeHomelabSnapshotToMemory(payload, new Date('2026-05-05T00:00:00.000Z'))
    writeHomelabSnapshotToMemory({
      ...payload,
        node: { ...payload.node, uptimeSeconds: 200 },
      kpis: payload.kpis.map((kpi) => kpi.key === 'cpu' ? { ...kpi, value: 55 } : kpi),
      services: [
        { name: 'traefik', state: 'up', detail: 'up' },
        { name: 'jellyfin', state: 'down', detail: 'down' }
      ]
    }, new Date('2026-05-05T00:01:00.000Z'))

    writeHomelabSnapshotToMemory({
        ...payload,
        node: { ...payload.node, uptimeSeconds: 260 },
        kpis: payload.kpis.map((kpi) => kpi.key === 'cpu' ? { ...kpi, value: 60 } : kpi)
      }, new Date('2026-05-05T00:02:00.000Z'))

    const response = buildHomelabResponse(
      readHomelabSnapshotFromMemory(),
      'memory',
      new Date('2026-05-05T00:02:30.000Z')
    )

    expect(response.source).toBe('memory')
    expect(response.data?.node.uptimeSeconds).toBe(260)
    expect(response.history.map((sample) => sample.kpis.cpu)).toEqual([23.46, 55, 60])
    expect(response.data?.services.find((service) => service.name === 'jellyfin')?.state).toBe('slow')
  })

  test('D1 adapter writes structured metric and service rows', async () => {
    const db = new FakeD1()
    await writeHomelabSnapshotToD1(db, payload, new Date('2026-05-05T00:00:00.000Z'))
    await writeHomelabSnapshotToD1(db, {
      ...payload,
      node: { ...payload.node, uptimeSeconds: 222 },
      kpis: payload.kpis.map((kpi) => kpi.key === 'cpu' ? { ...kpi, value: 88 } : kpi),
      services: [
        { name: 'traefik', state: 'up', detail: 'up' },
        { name: 'jellyfin', state: 'down', detail: 'down' }
      ]
    }, new Date('2026-05-05T00:01:00.000Z'))

    expect(db.metrics).toHaveLength(2)
    expect(db.services).toHaveLength(4)
    expect(db.metrics[1]?.cpu_pct).toBe(88)
    expect(db.metrics[1]?.node_id).toBe('nas')
    expect(db.services.find((service) => service.ts === 1777939260 && service.service === 'jellyfin')).toEqual({
      ts: 1777939260,
      node_id: 'nas',
      service: 'jellyfin',
      state: 'down'
    })

    const snapshot = await readHomelabSnapshotFromD1(db)
    expect(snapshot?.data.node.uptimeSeconds).toBe(222)
    expect(snapshot?.history.map((sample) => sample.kpis.cpu)).toEqual([23.46, 88])
    expect(snapshot?.data.services.find((service) => service.name === 'jellyfin')?.state).toBe('down')
  })

  test('D1 adapter aggregates independent node snapshots', async () => {
    const db = new FakeD1()
    await writeHomelabSnapshotToD1(db, payload, new Date('2026-05-05T00:00:00.000Z'))
    await writeHomelabSnapshotToD1(db, {
      ...payload,
      node: { id: 'pi5', name: 'pi5', role: 'edge services', uptimeSeconds: 100 },
      kpis: payload.kpis.map((kpi) => kpi.key === 'cpu' ? { ...kpi, value: 11 } : kpi),
      services: [
        { name: 'pihole', state: 'up', detail: 'up' }
      ]
    }, new Date('2026-05-05T00:01:00.000Z'))
    await writeHomelabSnapshotToD1(db, {
      ...payload,
      node: { ...payload.node, uptimeSeconds: 260 },
      kpis: payload.kpis.map((kpi) => kpi.key === 'cpu' ? { ...kpi, value: 55 } : kpi)
    }, new Date('2026-05-05T00:02:00.000Z'))

    const response = buildHomelabResponse(
      await readHomelabSnapshotFromD1(db),
      'd1',
      new Date('2026-05-05T00:02:30.000Z')
    )

    expect(response.nodes.map((node) => node.id)).toEqual(['nas', 'pi5'])
    expect(response.nodes.find((node) => node.id === 'nas')?.history.map((sample) => sample.kpis.cpu)).toEqual([23.46, 55])
    expect(response.nodes.find((node) => node.id === 'pi5')?.history.map((sample) => sample.kpis.cpu)).toEqual([11])
    expect(response.services.find((service) => service.nodeId === 'pi5' && service.name === 'pihole')?.state).toBe('up')
    expect(response.stale).toBe(false)
  })
})

class FakeD1 implements HomelabD1Database {
  metrics: HomelabMetricRow[] = []
  services: HomelabServiceRow[] = []

  prepare(query: string) {
    const db = this
    const statement = {
      values: [] as unknown[],
      bind(...values: unknown[]) {
        this.values = values
        return this
      },
      async first<T>() {
        return null as T | null
      },
      async all<T>() {
        if (query.includes('FROM service_status')) {
          const latestMetricTs = new Map<string, number>()
          for (const row of db.metrics) {
            const nodeId = row.node_id ?? 'homelab'
            const current = latestMetricTs.get(nodeId)
            if (!current || row.ts > current) latestMetricTs.set(nodeId, row.ts)
          }
          return {
            results: db.services
              .filter((row) => latestMetricTs.get(row.node_id ?? 'homelab') === row.ts)
              .sort((a, b) => (a.node_id ?? '').localeCompare(b.node_id ?? '') || a.service.localeCompare(b.service)) as T[]
          }
        }

        if (query.includes('FROM metrics')) {
          const limit = Number(this.values[0] ?? 60)
          return { results: [...db.metrics].sort((a, b) => b.ts - a.ts).slice(0, limit) as T[] }
        }

        return { results: [] as T[] }
      },
      async run() {
        if (query.startsWith('INSERT INTO metrics')) {
          const row: HomelabMetricRow = {
            ts: Number(this.values[0]),
            node_id: String(this.values[1]),
            cpu_pct: this.values[2] as number | null,
            mem_pct: this.values[3] as number | null,
            temp_c: this.values[4] as number | null,
            power_w: this.values[5] as number | null,
            load_1m: this.values[6] as number | null,
            meta_json: String(this.values[7])
          }
          db.metrics = [...db.metrics.filter((metric) => !(metric.ts === row.ts && metric.node_id === row.node_id)), row].sort((a, b) => a.ts - b.ts)
        }

        if (query.startsWith('INSERT INTO service_status')) {
          const row: HomelabServiceRow = {
            ts: Number(this.values[0]),
            node_id: String(this.values[1]),
            service: String(this.values[2]),
            state: this.values[3] as HomelabServiceRow['state']
          }
          db.services = [
            ...db.services.filter((service) => !(service.ts === row.ts && service.node_id === row.node_id && service.service === row.service)),
            row
          ].sort((a, b) => a.ts - b.ts || (a.node_id ?? '').localeCompare(b.node_id ?? '') || a.service.localeCompare(b.service))
        }

        if (query.startsWith('DELETE FROM metrics')) {
          const cutoff = Number(this.values[0])
          db.metrics = db.metrics.filter((metric) => metric.ts >= cutoff)
        }

        if (query.startsWith('DELETE FROM service_status')) {
          const cutoff = Number(this.values[0])
          db.services = db.services.filter((service) => service.ts >= cutoff)
        }

        return {}
      }
    }
    return statement
  }

  async batch(statements: ReturnType<FakeD1['prepare']>[]) {
    return Promise.all(statements.map((statement) => statement.run()))
  }
}
