import type { HomelabStatusResponse } from '#shared/homelab/types'
import { buildHomelabView, emptyHomelabStatus } from '#shared/homelab/view'

/**
 * Live homelab status from /api/status, plus the panel view built from it.
 * Pass pollMs to keep refreshing while the page is open.
 */
export function useHomelabStatus(options: { pollMs?: number } = {}) {
  const { data: status, refresh } = useFetch<HomelabStatusResponse>('/api/status', {
    key: 'homelab-status',
    default: emptyHomelabStatus
  })

  // "updated 40s ago" is measured from the response's own fetch time until
  // the page mounts, so the server render and hydration print the same text.
  const clock = ref<number | null>(null)
  const now = computed(() => clock.value ?? (Date.parse(status.value?.fetchedAt ?? '') || 0))
  const view = computed(() => buildHomelabView(status.value, now.value))

  let clockTimer: ReturnType<typeof setInterval> | undefined
  let pollTimer: ReturnType<typeof setInterval> | undefined

  onMounted(() => {
    clock.value = Date.now()
    clockTimer = setInterval(() => { clock.value = Date.now() }, 5_000)
    if (options.pollMs) pollTimer = setInterval(() => { refresh() }, options.pollMs)
  })

  onBeforeUnmount(() => {
    clearInterval(clockTimer)
    clearInterval(pollTimer)
  })

  return { status, view, refresh }
}
