<script setup lang="ts">
type HomelabServiceState = 'up' | 'slow' | 'down'
type HomelabService = {
  name: string
  state: HomelabServiceState
  detail: string
}
type HomelabStatusResponse = {
  data: {
    version: 1
    node: { name: string; uptimeSeconds: number }
    kpis: unknown[]
    services: HomelabService[]
  } | null
  unavailable: boolean
  stale: boolean
}

const DEFAULT_SERVICES = [
  'traefik', 'immich_server', 'jellyfin', 'suwayomi', 'paperless', 'beszel'
]

const { data: status } = await useFetch<HomelabStatusResponse>('/api/status', {
  default: () => ({
    data: null,
    unavailable: true,
    stale: true
  })
})

const services = computed(() => {
  if (status.value?.data?.services?.length) return status.value.data.services
  return DEFAULT_SERVICES.map((name) => ({
    name,
    state: 'slow' as const,
    detail: 'waiting'
  }))
})
</script>

<template>
  <section class="services-section">
    <h2>Services</h2>
    <div class="service-list">
      <div
        v-for="s in services"
        :key="s.name"
        :class="['service-row', `svc-${s.state}`]"
      >
        <div class="service-name">
          <span class="svc-dot" />
          <span>{{ s.name }}</span>
        </div>
        <span class="service-detail">{{ s.detail }}</span>
      </div>
    </div>
  </section>
</template>
