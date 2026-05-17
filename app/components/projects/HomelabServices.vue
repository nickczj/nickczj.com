<script setup lang="ts">
type HomelabServiceState = 'up' | 'slow' | 'down'
type HomelabService = {
  name: string
  state: HomelabServiceState
  detail: string
}
type HomelabFleetService = HomelabService & {
  nodeId: string
  nodeName: string
}
type HomelabStatusResponse = {
  data: {
    node: { id?: string; name: string }
    kpis: unknown[]
    services: HomelabService[]
  } | null
  services: HomelabFleetService[]
  unavailable: boolean
  stale: boolean
}

const DEFAULT_SERVICES = [
  { nodeId: 'nas', nodeName: 'nas', name: 'traefik' },
  { nodeId: 'nas', nodeName: 'nas', name: 'immich_server' },
  { nodeId: 'nas', nodeName: 'nas', name: 'jellyfin' },
  { nodeId: 'nas', nodeName: 'nas', name: 'suwayomi' },
  { nodeId: 'nas', nodeName: 'nas', name: 'paperless' },
  { nodeId: 'nas', nodeName: 'nas', name: 'beszel' },
  { nodeId: 'nas', nodeName: 'nas', name: 'tailscale' },
  { nodeId: 'pi5', nodeName: 'pi5', name: 'tailscale' },
  { nodeId: 'ha-yellow', nodeName: 'ha-yellow', name: 'tailscale' }
]

const { data: status } = await useFetch<HomelabStatusResponse>('/api/status', {
  default: () => ({
    data: null,
    services: [],
    unavailable: true,
    stale: true
  })
})

const services = computed(() => {
  if (status.value?.services?.length) return status.value.services
  if (status.value?.data?.services?.length) return status.value.data.services
    .map((service) => ({
      ...service,
      nodeId: status.value?.data?.node.id ?? status.value?.data?.node.name ?? 'homelab',
      nodeName: status.value?.data?.node.name ?? 'homelab'
    }))
  return DEFAULT_SERVICES.map((name) => ({
    ...name,
    state: 'slow' as const,
    detail: 'waiting'
  }))
})

function serviceDisplayName(name: string) {
  if (name === 'immich_server') return 'immich'
  return name.replace(/[_-]+/g, ' ')
}
</script>

<template>
  <section class="services-section">
    <h2>Services</h2>
    <div class="service-list">
      <div
        v-for="s in services"
        :key="`${s.nodeId}:${s.name}`"
        :class="['service-row', `svc-${s.state}`]"
      >
        <div class="service-name">
          <span class="svc-dot" />
          <span>{{ s.nodeId }} / {{ serviceDisplayName(s.name) }}</span>
        </div>
        <span class="service-detail">{{ s.detail }}</span>
      </div>
    </div>
  </section>
</template>
