import { describe, expect, test } from 'bun:test'
import {
  alertText,
  decide,
  formatDuration,
  formatSgt,
  runWatchdog,
  STALE_AFTER_SECONDS,
  type WatchdogDatabase
} from '../workers/homelab-watchdog/src/watchdog'

// 2026-11-24 02:31:35 SGT, the last upstream reply before the 24 Nov outage.
const OUTAGE_START = 1795458695
const OUTAGE_END = 1795484354

const nodesAt = (ts: number) => [
  { nodeId: 'nas', lastTs: ts - 30 },
  { nodeId: 'pi5', lastTs: ts },
  { nodeId: 'ha-yellow', lastTs: ts - 60 }
]

describe('watchdog decision', () => {
  test('stays quiet while any node is fresh', () => {
    const now = OUTAGE_START + 100
    expect(decide(nodesAt(OUTAGE_START), null, now)).toEqual({ action: 'none', reason: 'online' })
  })

  test('tolerates normal push jitter', () => {
    const now = OUTAGE_START + STALE_AFTER_SECONDS
    expect(decide(nodesAt(OUTAGE_START), null, now).action).toBe('none')
  })

  test('opens an incident when every node is stale', () => {
    const now = OUTAGE_START + STALE_AFTER_SECONDS + 1
    expect(decide(nodesAt(OUTAGE_START), null, now)).toEqual({
      action: 'open',
      startTs: OUTAGE_START,
      nodes: ['ha-yellow', 'nas', 'pi5']
    })
  })

  test('does not reopen an ongoing outage', () => {
    const open = { id: 7, startTs: OUTAGE_START }
    expect(decide(nodesAt(OUTAGE_START), open, OUTAGE_START + 3600).action).toBe('none')
  })

  test('closes at the first heartbeat after the start', () => {
    const open = { id: 7, startTs: OUTAGE_START }
    const now = OUTAGE_END + 200
    expect(decide(nodesAt(OUTAGE_END + 150), open, now, OUTAGE_END)).toEqual({
      action: 'close',
      incidentId: 7,
      startTs: OUTAGE_START,
      endTs: OUTAGE_END,
      durationS: OUTAGE_END - OUTAGE_START
    })
  })

  test('falls back to the earliest fresh heartbeat', () => {
    const open = { id: 7, startTs: OUTAGE_START }
    const decision = decide(nodesAt(OUTAGE_END), open, OUTAGE_END + 10)
    expect(decision.action === 'close' && decision.endTs).toBe(OUTAGE_END - 60)
  })

  test('ignores an empty fleet', () => {
    expect(decide([], null, OUTAGE_START).action).toBe('none')
  })
})

describe('watchdog formatting', () => {
  test('formats SGT times and durations', () => {
    expect(formatSgt(OUTAGE_START)).toBe('Tue 24 Nov 02:31')
    expect(formatSgt(OUTAGE_END, false)).toBe('09:39')
    expect(formatDuration(OUTAGE_END - OUTAGE_START)).toBe('7h 8m')
    expect(formatDuration(708)).toBe('12 min')
  })

  test('writes the alert texts', () => {
    expect(alertText({ action: 'open', startTs: OUTAGE_START, nodes: ['nas', 'pi5'] })).toContain(
      'No homelab heartbeat since Tue 24 Nov 02:31 SGT (nas, pi5)'
    )
    expect(
      alertText({
        action: 'close',
        incidentId: 1,
        startTs: OUTAGE_START,
        endTs: OUTAGE_END,
        durationS: OUTAGE_END - OUTAGE_START
      })
    ).toContain('Down Tue 24 Nov 02:31–09:39 SGT (7h 8m)')
  })
})

type Incident = { id: number; start_ts: number; end_ts: number | null; duration_s: number | null; source: string }

function fakeDb(metrics: { node_id: string; ts: number }[], incidents: Incident[] = []): WatchdogDatabase {
  return {
    prepare(query: string) {
      let args: unknown[] = []
      const statement = {
        bind(...values: unknown[]) {
          args = values
          return statement
        },
        async all<T>() {
          if (query.includes('GROUP BY node_id')) {
            const last = new Map<string, number>()
            for (const row of metrics) last.set(row.node_id, Math.max(last.get(row.node_id) ?? 0, row.ts))
            return { results: [...last].map(([node_id, last_ts]) => ({ node_id, last_ts })) as T[] }
          }
          throw new Error(`unexpected all(): ${query}`)
        },
        async first<T>() {
          if (query.includes('FROM wan_incidents')) {
            return (incidents.find((row) => row.end_ts === null && row.source === args[0]) ?? null) as T | null
          }
          if (query.includes('MIN(ts)')) {
            const after = metrics.filter((row) => row.ts > Number(args[0])).map((row) => row.ts)
            return { ts: after.length ? Math.min(...after) : null } as T
          }
          throw new Error(`unexpected first(): ${query}`)
        },
        async run() {
          if (query.startsWith('INSERT OR IGNORE')) {
            if (incidents.some((row) => row.end_ts === null && row.source === args[1])) return { meta: { changes: 0 } }
            incidents.push({ id: incidents.length + 1, start_ts: Number(args[0]), end_ts: null, duration_s: null, source: String(args[1]) })
            return { meta: { changes: 1 } }
          }
          if (query.startsWith('UPDATE wan_incidents')) {
            const row = incidents.find((item) => item.id === args[2] && item.end_ts === null)
            if (row) {
              row.end_ts = Number(args[0])
              row.duration_s = Number(args[1])
            }
            return { meta: { changes: row ? 1 : 0 } }
          }
          throw new Error(`unexpected run(): ${query}`)
        }
      }
      return statement
    }
  }
}

function fakeTelegram() {
  const sent: { url: string; body: { chat_id: string; text: string } }[] = []
  const fetcher = async (url: string, init?: RequestInit) => {
    sent.push({ url, body: JSON.parse(String(init?.body)) })
    return new Response('{"ok":true}', { status: 200 })
  }
  return { sent, fetcher }
}

describe('watchdog run', () => {
  const secrets = { TELEGRAM_BOT_TOKEN: 'test-token', TELEGRAM_CHAT_ID: '42' }

  test('opens, stays quiet, then closes with one alert each', async () => {
    const metrics = [
      { node_id: 'nas', ts: OUTAGE_START - 20 },
      { node_id: 'pi5', ts: OUTAGE_START }
    ]
    const incidents: Incident[] = []
    const db = fakeDb(metrics, incidents)
    const telegram = fakeTelegram()
    const env = { HOMELAB_DB: db, ...secrets }

    expect((await runWatchdog(env, OUTAGE_START + 400, telegram.fetcher)).action).toBe('open')
    expect((await runWatchdog(env, OUTAGE_START + 520, telegram.fetcher)).action).toBe('none')
    expect(incidents).toHaveLength(1)

    metrics.push({ node_id: 'nas', ts: OUTAGE_END }, { node_id: 'pi5', ts: OUTAGE_END + 40 })
    expect((await runWatchdog(env, OUTAGE_END + 60, telegram.fetcher)).action).toBe('close')
    expect(incidents[0]).toMatchObject({ end_ts: OUTAGE_END, duration_s: OUTAGE_END - OUTAGE_START })

    expect(telegram.sent).toHaveLength(2)
    expect(telegram.sent[0]?.url).toBe('https://api.telegram.org/bottest-token/sendMessage')
    expect(telegram.sent[0]?.body.chat_id).toBe('42')
    expect(telegram.sent[0]?.body.text).toContain('Home internet down')
    expect(telegram.sent[1]?.body.text).toContain('(7h 8m)')
  })

  test('dry run writes nothing and sends nothing', async () => {
    const incidents: Incident[] = []
    const telegram = fakeTelegram()
    const env = { HOMELAB_DB: fakeDb([{ node_id: 'nas', ts: OUTAGE_START }], incidents), ...secrets, WATCHDOG_DRY_RUN: '1' }
    expect((await runWatchdog(env, OUTAGE_START + 1000, telegram.fetcher)).action).toBe('open')
    expect(incidents).toHaveLength(0)
    expect(telegram.sent).toHaveLength(0)
  })

  test('records the incident even without Telegram secrets', async () => {
    const incidents: Incident[] = []
    const telegram = fakeTelegram()
    const env = { HOMELAB_DB: fakeDb([{ node_id: 'nas', ts: OUTAGE_START }], incidents) }
    expect((await runWatchdog(env, OUTAGE_START + 1000, telegram.fetcher)).action).toBe('open')
    expect(incidents).toHaveLength(1)
    expect(telegram.sent).toHaveLength(0)
  })
})
