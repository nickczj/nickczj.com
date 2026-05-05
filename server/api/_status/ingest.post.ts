import { createError, defineEventHandler, getHeader, readBody, setHeader } from 'h3'
import {
  type HomelabD1Database,
  validateHomelabPayload,
  writeHomelabSnapshotToD1,
  writeHomelabSnapshotToMemory
} from '../../utils/homelab-status'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')

  const expectedToken = getSecret(event, 'HOMELAB_STATUS_TOKEN')
  if (!expectedToken) {
    throw createError({
      statusCode: 503,
      statusMessage: 'Homelab ingest is not configured'
    })
  }

  const authorization = getHeader(event, 'authorization')
  if (authorization !== `Bearer ${expectedToken}`) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized'
    })
  }

  const parsed = validateHomelabPayload(await readBody(event))
  if (!parsed.ok) {
    throw createError({
      statusCode: 400,
      statusMessage: parsed.error
    })
  }

  const db = getHomelabDb(event)
  const snapshot = db
    ? await writeHomelabSnapshotToD1(db, parsed.value)
    : writeHomelabSnapshotToMemory(parsed.value)

  return {
    ok: true,
    source: db ? 'd1' : 'memory',
    updatedAt: snapshot.reportedAt
  }
})

function getHomelabDb(event: { context: unknown }) {
  const env = getCloudflareEnv(event)
  return env?.HOMELAB_DB as HomelabD1Database | undefined
}

function getSecret(event: { context: unknown }, key: string) {
  const value = getCloudflareEnv(event)?.[key] ?? process.env[key]
  return typeof value === 'string' && value.length > 0 ? value : ''
}

function getCloudflareEnv(event: { context: unknown }) {
  const context = event.context as { cloudflare?: { env?: Record<string, unknown> } }
  return context.cloudflare?.env
}
