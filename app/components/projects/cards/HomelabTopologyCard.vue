<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { Handle, Position, VueFlow } from '@vue-flow/core'
import type { Edge, Node } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import '@vue-flow/core/dist/style.css'

type TopologyTone = 'mesh' | 'compute' | 'storage' | 'automation'

type TopologyNodeData = {
  eyebrow: string
  title: string
  meta: string
  badge: string
  tone: TopologyTone
  services: string[]
}

type LayoutSpec = {
  key: string
  height: number
}

const isCompact = ref(false)
let mediaQuery: MediaQueryList | null = null

function syncCompactLayout() {
  isCompact.value = Boolean(mediaQuery?.matches)
}

onMounted(() => {
  mediaQuery = window.matchMedia('(max-width: 700px)')
  syncCompactLayout()
  mediaQuery.addEventListener('change', syncCompactLayout)
})

onBeforeUnmount(() => {
  mediaQuery?.removeEventListener('change', syncCompactLayout)
  mediaQuery = null
})

function createNode(
  id: string,
  type: 'mesh' | 'device',
  data: TopologyNodeData,
  position: { x: number; y: number },
  dimensions: { width: number; height: number }
): Node<TopologyNodeData> {
  return {
    id,
    type,
    data,
    position,
    width: dimensions.width,
    height: dimensions.height,
    draggable: false,
    selectable: false,
    connectable: false,
    focusable: false,
    deletable: false,
    targetPosition: Position.Top,
    sourcePosition: Position.Bottom,
    ariaLabel: `${data.title}: ${data.meta}`,
  }
}

const layoutSpec = computed<LayoutSpec>(() => {
  if (isCompact.value) {
    return { key: 'compact', height: 462 }
  }

  return { key: 'wide', height: 340 }
})

const nodes = computed<Node<TopologyNodeData>[]>(() => {
  if (isCompact.value) {
    return [
      createNode('tailscale', 'mesh', {
        eyebrow: 'Private overlay',
        title: 'Tailscale mesh',
        meta: 'Remote access without public ingress',
        badge: 'TS',
        tone: 'mesh',
        services: ['WireGuard', 'ACLs'],
      }, { x: 105, y: 24 }, { width: 180, height: 74 }),
      createNode('pi', 'device', {
        eyebrow: 'Compute',
        title: 'Raspberry Pi 5',
        meta: 'Docker host and edge services',
        badge: 'Pi',
        tone: 'compute',
        services: ['Pi-hole', 'Traefik', 'Docker', 'Immich', 'Jellyfin'],
      }, { x: 18, y: 126 }, { width: 166, height: 132 }),
      createNode('nas', 'device', {
        eyebrow: 'Storage',
        title: 'Ugreen NAS',
        meta: 'Media, documents, backups',
        badge: 'NAS',
        tone: 'storage',
        services: ['Paperless', 'Beszel', 'Suwayomi', 'Backups'],
      }, { x: 206, y: 126 }, { width: 166, height: 132 }),
      createNode('ha', 'device', {
        eyebrow: 'Automation',
        title: 'HA Yellow',
        meta: 'CM5 smart-home controller',
        badge: 'HA',
        tone: 'automation',
        services: ['Home Assistant', 'Zigbee', 'Thread'],
      }, { x: 105, y: 282 }, { width: 180, height: 132 }),
    ]
  }

  return [
    createNode('tailscale', 'mesh', {
      eyebrow: 'Private overlay',
      title: 'Tailscale mesh',
      meta: 'Remote access without public ingress',
      badge: 'TS',
      tone: 'mesh',
      services: ['WireGuard', 'ACLs'],
    }, { x: 174, y: 24 }, { width: 184, height: 74 }),
    createNode('pi', 'device', {
      eyebrow: 'Compute',
      title: 'Raspberry Pi 5',
      meta: 'Docker host and edge services',
      badge: 'Pi',
      tone: 'compute',
      services: ['Pi-hole', 'Traefik', 'Docker', 'Immich', 'Jellyfin'],
    }, { x: 16, y: 142 }, { width: 160, height: 164 }),
    createNode('nas', 'device', {
      eyebrow: 'Storage',
      title: 'Ugreen NAS',
      meta: 'Media, documents, backups',
      badge: 'NAS',
      tone: 'storage',
      services: ['Paperless', 'Beszel', 'Suwayomi', 'Backups'],
    }, { x: 186, y: 142 }, { width: 160, height: 164 }),
    createNode('ha', 'device', {
      eyebrow: 'Automation',
      title: 'HA Yellow',
      meta: 'CM5 smart-home controller',
      badge: 'HA',
      tone: 'automation',
      services: ['Home Assistant', 'Zigbee', 'Thread'],
    }, { x: 356, y: 142 }, { width: 160, height: 164 }),
  ]
})

const edges = computed<Edge[]>(() => [
  {
    id: 'tailscale-pi',
    source: 'tailscale',
    target: 'pi',
    type: 'smoothstep',
    class: 'mesh-edge',
    selectable: false,
    focusable: false,
    interactionWidth: 0,
  },
  {
    id: 'tailscale-nas',
    source: 'tailscale',
    target: 'nas',
    type: 'smoothstep',
    class: 'mesh-edge',
    selectable: false,
    focusable: false,
    interactionWidth: 0,
  },
  {
    id: 'tailscale-ha',
    source: 'tailscale',
    target: 'ha',
    type: 'smoothstep',
    class: 'mesh-edge',
    selectable: false,
    focusable: false,
    interactionWidth: 0,
  },
])
</script>

<template>
  <div
    class="topology-card"
    aria-label="Homelab topology preview"
  >
    <VueFlow
      :key="layoutSpec.key"
      class="topology-flow"
      :style="{ height: `${layoutSpec.height}px` }"
      :nodes="nodes"
      :edges="edges"
      :fit-view-on-init="true"
      :nodes-draggable="false"
      :nodes-connectable="false"
      :elements-selectable="false"
      :select-nodes-on-drag="false"
      :pan-on-drag="false"
      :pan-on-scroll="false"
      :zoom-on-scroll="false"
      :zoom-on-pinch="false"
      :zoom-on-double-click="false"
      :prevent-scrolling="false"
      :nodes-focusable="false"
      :edges-focusable="false"
      :connect-on-click="false"
      :min-zoom="0.45"
      :max-zoom="1.15"
    >
      <Background variant="dots" :gap="24" :size="1.2" color="var(--topology-grid)" />

      <template #node-mesh="{ data }">
        <div class="topology-node topology-node-mesh" :data-tone="data.tone">
          <Handle type="source" :position="Position.Bottom" class="topology-handle" />
          <div class="topology-node-header">
            <span class="topology-node-badge">{{ data.badge }}</span>
            <span class="topology-node-eyebrow">{{ data.eyebrow }}</span>
          </div>
          <strong class="topology-node-title">{{ data.title }}</strong>
          <span class="topology-node-meta">{{ data.meta }}</span>
        </div>
      </template>

      <template #node-device="{ data }">
        <div class="topology-node topology-node-device" :data-tone="data.tone">
          <Handle type="target" :position="Position.Top" class="topology-handle" />
          <div class="topology-node-header">
            <span class="topology-node-badge">{{ data.badge }}</span>
            <span class="topology-node-eyebrow">{{ data.eyebrow }}</span>
          </div>
          <strong class="topology-node-title">{{ data.title }}</strong>
          <span class="topology-node-meta">{{ data.meta }}</span>
          <div class="topology-service-list" aria-label="Services">
            <span v-for="service in data.services" :key="service" class="topology-service">
              {{ service }}
            </span>
          </div>
        </div>
      </template>
    </VueFlow>
  </div>
</template>

<style scoped>
.topology-card {
  width: 100%;
  --topology-grid: rgba(20, 91, 99, 0.14);
  --topology-surface: color-mix(in srgb, var(--bg), var(--heading) 4%);
  --topology-surface-strong: color-mix(in srgb, var(--bg), var(--heading) 7%);
  --topology-mesh: color-mix(in srgb, var(--link), var(--heading) 18%);
  --topology-shadow: rgba(38, 48, 44, 0.08);
  background: linear-gradient(180deg, var(--topology-surface), var(--bg));
  overflow: hidden;
}

[data-theme="dark"] .topology-card {
  --topology-grid: rgba(88, 185, 194, 0.14);
  --topology-surface: color-mix(in srgb, var(--bg), white 4%);
  --topology-surface-strong: color-mix(in srgb, var(--bg), white 7%);
  --topology-mesh: color-mix(in srgb, var(--link), white 6%);
  --topology-shadow: rgba(0, 0, 0, 0.24);
}

.topology-flow {
  width: 100%;
  background: transparent;
}

.topology-card :deep(.vue-flow__pane) {
  cursor: default;
}

.topology-card :deep(.vue-flow__node) {
  background: transparent;
  border: 0;
  box-shadow: none;
  color: inherit;
}

.topology-card :deep(.vue-flow__node:focus),
.topology-card :deep(.vue-flow__node:focus-visible) {
  outline: none;
}

.topology-card :deep(.vue-flow__edge.mesh-edge .vue-flow__edge-path) {
  stroke: var(--topology-mesh);
  stroke-width: 1.7;
  stroke-dasharray: 7 6;
  stroke-linecap: round;
}

.topology-node {
  position: relative;
  box-sizing: border-box;
  display: grid;
  align-content: start;
  gap: 0.4rem;
  width: 100%;
  height: 100%;
  padding: 0.72rem;
  border: 1px solid var(--rule);
  border-radius: 8px;
  background: var(--topology-surface);
  box-shadow: 0 10px 24px var(--topology-shadow);
  color: var(--heading);
}

.topology-node::before {
  content: "";
  position: absolute;
  inset: 0;
  border-top: 3px solid var(--node-accent, var(--link));
  border-radius: inherit;
  pointer-events: none;
}

.topology-node[data-tone="mesh"] {
  --node-accent: var(--link);
  background: var(--topology-surface-strong);
}

.topology-node[data-tone="compute"] {
  --node-accent: #4c7d52;
}

.topology-node[data-tone="storage"] {
  --node-accent: #8b6334;
}

.topology-node[data-tone="automation"] {
  --node-accent: #6d6fa7;
}

.topology-node-header {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  min-width: 0;
}

.topology-node-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  flex: 0 0 auto;
  border: 1px solid color-mix(in srgb, var(--node-accent, var(--link)), transparent 42%);
  border-radius: 7px;
  background: color-mix(in srgb, var(--node-accent, var(--link)), transparent 88%);
  color: var(--heading);
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0;
}

.topology-node-eyebrow {
  min-width: 0;
  color: var(--muted);
  font-size: 0.62rem;
  font-weight: 800;
  letter-spacing: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  text-transform: uppercase;
  white-space: nowrap;
}

.topology-node-title {
  color: var(--heading);
  font-size: 0.88rem;
  line-height: 1.15;
}

.topology-node-meta {
  color: var(--muted);
  font-size: 0.68rem;
  line-height: 1.3;
}

.topology-service-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.24rem;
  min-width: 0;
  padding-top: 0.08rem;
}

.topology-service {
  max-width: 100%;
  padding: 0.1rem 0.36rem;
  border: 1px solid var(--tag-border);
  border-radius: 999px;
  color: var(--link);
  font-size: 0.58rem;
  font-weight: 700;
  line-height: 1.35;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.topology-handle {
  opacity: 0;
  pointer-events: none;
}

@media (max-width: 700px) {
  .topology-node {
    padding: 0.65rem;
  }

  .topology-node-title {
    font-size: 0.78rem;
  }

  .topology-node-meta {
    font-size: 0.62rem;
  }

  .topology-service {
    font-size: 0.54rem;
  }
}
</style>
