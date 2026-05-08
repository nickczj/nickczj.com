import { defineEventHandler, setHeader } from 'h3'
import {
  type HomelabD1Database,
  buildHomelabResponse,
  readHomelabSnapshotFromD1,
  readHomelabSnapshotFromMemory
} from '../utils/homelab-status'
import {
  buildHomelabFixtureResponse,
  isHomelabFixtureMode,
  type HomelabFixtureMode
} from '../utils/homelab-status-fixtures'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'public, max-age=30, stale-while-revalidate=60')

  const explicitFixture = getExplicitFixtureMode(event)
  if (explicitFixture) {
    return buildHomelabFixtureResponse(explicitFixture)
  }

  const db = getHomelabDb(event)
  if (!db) {
    const memorySnapshot = readHomelabSnapshotFromMemory()
    if (memorySnapshot) return buildHomelabResponse(memorySnapshot, 'memory')
    if (shouldUseLocalFixture(event)) return buildHomelabFixtureResponse('fleet')
    return buildHomelabResponse(null, 'memory')
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

function getExplicitFixtureMode(event: { context: unknown }): HomelabFixtureMode | null {
  const raw = getEnv(event, 'HOMELAB_STATUS_FIXTURE')
  if (!raw || raw === 'none' || raw === 'off' || raw === 'false') return null
  return isHomelabFixtureMode(raw) ? raw : null
}

function shouldUseLocalFixture(event: { context: unknown }) {
  if (getEnv(event, 'HOMELAB_STATUS_FIXTURE') === 'none') return false
  if (getHomelabDb(event)) return false
  return import.meta.dev || process.env.NODE_ENV === 'development'
}

function getEnv(event: { context: unknown }, key: string) {
  const context = event.context as { cloudflare?: { env?: Record<string, unknown> } }
  const value = context.cloudflare?.env?.[key] ?? process.env[key]
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}
