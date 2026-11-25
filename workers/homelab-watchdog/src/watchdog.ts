// Home internet watchdog. NAS, pi5 and HA Yellow each push a heartbeat to
// D1 `metrics` every two minutes (see server/utils/homelab-status.ts). When
// every node has gone quiet, the home connection is down; this runs outside
// the home, so it can still send the alert.

/** Seconds without any heartbeat before the home counts as offline. The
 * normal worst case between pushes is about 250 s (pi5 timer jitter). */
export const STALE_AFTER_SECONDS = 360

export const INCIDENT_SOURCE = 'watchdog'

const TIME_ZONE = 'Asia/Singapore'

export type NodeLastSeen = { nodeId: string; lastTs: number }

export type OpenIncident = { id: number; startTs: number }

export type WatchdogDecision =
  | { action: 'none'; reason: string }
  | { action: 'open'; startTs: number; nodes: string[] }
  | { action: 'close'; incidentId: number; startTs: number; endTs: number; durationS: number }

/**
 * Decide what to do from each node's latest heartbeat.
 *
 * - All nodes stale and no open incident: open one. Its start is the last
 *   heartbeat heard from any node.
 * - Any node fresh and an incident open: close it. Its end is the first
 *   heartbeat after the start (`firstTsAfterStart`), falling back to the
 *   earliest fresh heartbeat.
 */
export function decide(
  nodes: NodeLastSeen[],
  open: OpenIncident | null,
  nowTs: number,
  firstTsAfterStart: number | null = null,
  staleAfter = STALE_AFTER_SECONDS
): WatchdogDecision {
  if (nodes.length === 0) return { action: 'none', reason: 'no nodes have reported' }

  const fresh = nodes.filter((node) => nowTs - node.lastTs <= staleAfter)
  const lastHeard = Math.max(...nodes.map((node) => node.lastTs))

  if (fresh.length === 0) {
    if (open) return { action: 'none', reason: 'outage ongoing' }
    return { action: 'open', startTs: lastHeard, nodes: nodes.map((node) => node.nodeId).sort() }
  }

  if (!open) return { action: 'none', reason: 'online' }

  const endTs = firstTsAfterStart ?? Math.min(...fresh.map((node) => node.lastTs))
  return {
    action: 'close',
    incidentId: open.id,
    startTs: open.startTs,
    endTs,
    durationS: Math.max(0, endTs - open.startTs)
  }
}

export function formatSgt(ts: number, withDate = true) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: TIME_ZONE,
    weekday: withDate ? 'short' : undefined,
    day: withDate ? '2-digit' : undefined,
    month: withDate ? 'short' : undefined,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(new Date(ts * 1000))
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? ''
  const time = `${get('hour')}:${get('minute')}`
  return withDate ? `${get('weekday')} ${get('day')} ${get('month')} ${time}` : time
}

export function formatDuration(seconds: number) {
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes} min`
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`
}

export function alertText(decision: WatchdogDecision) {
  if (decision.action === 'open') {
    return (
      `🔴 Home internet down. No homelab heartbeat since ${formatSgt(decision.startTs)} SGT ` +
      `(${decision.nodes.join(', ')}). Before power-cycling the ONT, note its LEDs (LOS, PON).`
    )
  }
  if (decision.action === 'close') {
    return (
      `🟢 Home internet back. Down ${formatSgt(decision.startTs)}–${formatSgt(decision.endTs, false)} SGT ` +
      `(${formatDuration(decision.durationS)}).`
    )
  }
  return null
}

// Minimal D1 surface, so this module runs under bun test without Workers types.
type D1Statement = {
  bind: (...values: unknown[]) => D1Statement
  first: <T = unknown>() => Promise<T | null>
  all: <T = unknown>() => Promise<{ results?: T[] }>
  run: () => Promise<{ meta?: { changes?: number } }>
}

export type WatchdogDatabase = { prepare: (query: string) => D1Statement }

export type WatchdogEnv = {
  HOMELAB_DB: WatchdogDatabase
  TELEGRAM_BOT_TOKEN?: string
  TELEGRAM_CHAT_ID?: string
  /** "1" logs the decision without writing incidents or sending alerts. */
  WATCHDOG_DRY_RUN?: string
}

type Fetch = (input: string, init?: RequestInit) => Promise<Response>

export async function runWatchdog(env: WatchdogEnv, nowTs = Math.floor(Date.now() / 1000), fetcher: Fetch = fetch) {
  const db = env.HOMELAB_DB
  const nodeRows = await db
    .prepare('SELECT node_id, MAX(ts) AS last_ts FROM metrics GROUP BY node_id')
    .all<{ node_id: string; last_ts: number }>()
  const nodes = (nodeRows.results ?? []).map((row) => ({ nodeId: row.node_id, lastTs: Number(row.last_ts) }))

  const openRow = await db
    .prepare('SELECT id, start_ts FROM wan_incidents WHERE source = ?1 AND end_ts IS NULL ORDER BY start_ts DESC LIMIT 1')
    .bind(INCIDENT_SOURCE)
    .first<{ id: number; start_ts: number }>()
  const open = openRow ? { id: Number(openRow.id), startTs: Number(openRow.start_ts) } : null

  let firstTsAfterStart: number | null = null
  if (open) {
    const row = await db
      .prepare('SELECT MIN(ts) AS ts FROM metrics WHERE ts > ?1')
      .bind(open.startTs)
      .first<{ ts: number | null }>()
    firstTsAfterStart = row?.ts == null ? null : Number(row.ts)
  }

  const decision = decide(nodes, open, nowTs, firstTsAfterStart)
  const dryRun = env.WATCHDOG_DRY_RUN === '1'
  if (decision.action === 'none' || dryRun) {
    console.log(JSON.stringify({ watchdog: decision, dryRun, nodes }))
    return decision
  }

  if (decision.action === 'open') {
    const result = await db
      .prepare('INSERT OR IGNORE INTO wan_incidents (start_ts, source, note) VALUES (?1, ?2, ?3)')
      .bind(decision.startTs, INCIDENT_SOURCE, `all nodes stale: ${decision.nodes.join(', ')}`)
      .run()
    // Another run already opened it; do not alert twice.
    if ((result.meta?.changes ?? 1) === 0) return { action: 'none', reason: 'already open' } as const
  } else {
    await db
      .prepare('UPDATE wan_incidents SET end_ts = ?1, duration_s = ?2 WHERE id = ?3 AND end_ts IS NULL')
      .bind(decision.endTs, decision.durationS, decision.incidentId)
      .run()
  }

  console.log(JSON.stringify({ watchdog: decision }))
  await sendTelegram(env, alertText(decision), fetcher)
  return decision
}

async function sendTelegram(env: WatchdogEnv, text: string | null, fetcher: Fetch) {
  if (!text) return
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) {
    console.warn('watchdog: TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set; alert not sent')
    return
  }
  const response = await fetcher(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, text, disable_web_page_preview: true })
  })
  if (!response.ok) {
    console.error(`watchdog: Telegram sendMessage failed with HTTP ${response.status}`)
  }
}
