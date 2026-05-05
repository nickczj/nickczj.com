import { defineEventHandler, setHeader } from 'h3'
import {
  type HomelabD1Database,
  buildHomelabResponse,
  readHomelabSnapshotFromD1,
  readHomelabSnapshotFromMemory
} from '../utils/homelab-status'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'public, max-age=30, stale-while-revalidate=60')

  const db = getHomelabDb(event)
  if (!db) {
    return buildHomelabResponse(readHomelabSnapshotFromMemory(), 'memory')
  }

  try {
    return buildHomelabResponse(await readHomelabSnapshotFromD1(db), 'd1')
  } catch {
    return buildHomelabResponse(null, 'none')
  }
})

function getHomelabDb(event: { context: unknown }) {
  const context = event.context as { cloudflare?: { env?: Record<string, unknown> } }
  return context.cloudflare?.env?.HOMELAB_DB as HomelabD1Database | undefined
}
