import { describe, expect, test } from 'bun:test'
import {
  appendHistorySample,
  buildHomelabResponse,
  type HomelabD1Database,
  type HomelabStatusPayload,
  readHomelabSnapshotFromD1,
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
    { name: 'traefik', status: 'ok', detail: 'up', uptimeSeconds: 100 },
    { name: 'jellyfin', status: 'warn', detail: 'starting' }
  ]
}

describe('homelab status validation', () => {
  test('accepts and sanitizes a valid payload', () => {
    const result = validateHomelabPayload(payload)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.kpis[0]?.value).toBe(23.46)
      expect(result.value.services[0]?.detail).toBe('up')
    }
  })

  test('rejects invalid versions and duplicate services', () => {
    expect(validateHomelabPayload({ ...payload, version: 2 }).ok).toBe(false)
    expect(validateHomelabPayload({
      ...payload,
      services: [
        { name: 'traefik', status: 'ok', detail: 'up' },
        { name: 'traefik', status: 'ok', detail: 'up' }
      ]
    }).ok).toBe(false)
  })
})

describe('homelab status snapshots', () => {
  test('caps KPI history', () => {
    let history = []
    for (let i = 0; i < 40; i++) {
      history = appendHistorySample(history, {
        ...payload,
        kpis: payload.kpis.map((kpi) => kpi.key === 'cpu' ? { ...kpi, value: i } : kpi)
      }, `2026-05-05T00:${String(i).padStart(2, '0')}:00.000Z`)
    }

    expect(history).toHaveLength(30)
    expect(history[0]?.kpis.cpu).toBe(10)
    expect(history[29]?.kpis.cpu).toBe(39)
  })

  test('marks old snapshots stale', () => {
    const response = buildHomelabResponse({
      data: payload,
      history: [],
      reportedAt: '2026-05-05T00:00:00.000Z',
      receivedAt: '2026-05-05T00:00:00.000Z'
    }, 'memory', new Date('2026-05-05T00:04:00.000Z'))

    expect(response.stale).toBe(true)
    expect(response.unavailable).toBe(false)
  })

  test('memory fallback stores latest payload', () => {
    resetHomelabMemorySnapshot()
    writeHomelabSnapshotToMemory(payload, new Date('2026-05-05T00:00:00.000Z'))

    const response = buildHomelabResponse(writeHomelabSnapshotToMemory({
      ...payload,
      node: { ...payload.node, uptimeSeconds: 200 }
    }, new Date('2026-05-05T00:01:00.000Z')), 'memory', new Date('2026-05-05T00:01:30.000Z'))

    expect(response.source).toBe('memory')
    expect(response.data?.node.uptimeSeconds).toBe(200)
    expect(response.history).toHaveLength(2)
  })

  test('D1 adapter upserts the fixed current row', async () => {
    const db = new FakeD1()
    await writeHomelabSnapshotToD1(db, payload, new Date('2026-05-05T00:00:00.000Z'))
    await writeHomelabSnapshotToD1(db, {
      ...payload,
      node: { ...payload.node, uptimeSeconds: 222 }
    }, new Date('2026-05-05T00:01:00.000Z'))

    const snapshot = await readHomelabSnapshotFromD1(db)
    expect(snapshot?.data.node.uptimeSeconds).toBe(222)
    expect(snapshot?.history).toHaveLength(2)
  })
})

class FakeD1 implements HomelabD1Database {
  row: Record<string, unknown> | null = null

  prepare(query: string) {
    const db = this
    const statement = {
      values: [] as unknown[],
      bind(...values: unknown[]) {
        this.values = values
        return this
      },
      async first<T>() {
        return (query.startsWith('SELECT') ? db.row : null) as T | null
      },
      async run() {
        if (query.startsWith('INSERT')) {
          db.row = {
            payload_json: this.values[2],
            history_json: this.values[3],
            reported_at: this.values[4],
            received_at: this.values[5]
          }
        }
        return {}
      }
    }
    return statement
  }
}
