import { runWatchdog, type WatchdogEnv } from './watchdog'

type ScheduledContext = { waitUntil: (promise: Promise<unknown>) => void }

export default {
  async scheduled(_controller: unknown, env: WatchdogEnv, ctx: ScheduledContext) {
    ctx.waitUntil(runWatchdog(env))
  },
  // Scheduled only. The Worker has no route or workers.dev URL; this keeps
  // `wrangler dev --test-scheduled` from erroring on other requests.
  async fetch() {
    return new Response('homelab-watchdog runs on a schedule only\n', { status: 404 })
  }
}
