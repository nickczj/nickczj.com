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
  node: { name: 'homelab-v3', uptimeSeconds: 123456 },
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
      expect(result.value.kpis[0]?.value).toBe(23.46)
      expect(result.value.services[0]?.state).toBe('up')
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
    expect(db.services.find((service) => service.ts === 1777939260 && service.service === 'jellyfin')).toEqual({
      ts: 1777939260,
      service: 'jellyfin',
      state: 'down'
    })

    const snapshot = await readHomelabSnapshotFromD1(db)
    expect(snapshot?.data.node.uptimeSeconds).toBe(222)
    expect(snapshot?.history.map((sample) => sample.kpis.cpu)).toEqual([23.46, 88])
    expect(snapshot?.data.services.find((service) => service.name === 'jellyfin')?.state).toBe('down')
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
        if (query.includes('FROM metrics')) {
          const limit = Number(this.values[0] ?? 60)
          return { results: [...db.metrics].sort((a, b) => b.ts - a.ts).slice(0, limit) as T[] }
        }

        if (query.includes('FROM service_status')) {
          const latest = new Map<string, HomelabServiceRow>()
          for (const row of db.services) {
            const current = latest.get(row.service)
            if (!current || row.ts > current.ts) latest.set(row.service, row)
          }
          return { results: [...latest.values()].sort((a, b) => a.service.localeCompare(b.service)) as T[] }
        }

        return { results: [] as T[] }
      },
      async run() {
        if (query.startsWith('INSERT INTO metrics')) {
          const row: HomelabMetricRow = {
            ts: Number(this.values[0]),
            cpu_pct: this.values[1] as number | null,
            mem_pct: this.values[2] as number | null,
            temp_c: this.values[3] as number | null,
            power_w: this.values[4] as number | null,
            load_1m: this.values[5] as number | null,
            meta_json: String(this.values[6])
          }
          db.metrics = [...db.metrics.filter((metric) => metric.ts !== row.ts), row].sort((a, b) => a.ts - b.ts)
        }

        if (query.startsWith('INSERT INTO service_status')) {
          const row: HomelabServiceRow = {
            ts: Number(this.values[0]),
            service: String(this.values[1]),
            state: this.values[2] as HomelabServiceRow['state']
          }
          db.services = [
            ...db.services.filter((service) => !(service.ts === row.ts && service.service === row.service)),
            row
          ].sort((a, b) => a.ts - b.ts || a.service.localeCompare(b.service))
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
