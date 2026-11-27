<script setup lang="ts">
import '~/assets/dashboard.css'
import type { HomelabPanelView } from '#shared/homelab/view'

// Presentational: pass it the view from useHomelabStatus(). The optional
// footer slot sits under the services list.
defineProps<{ view: HomelabPanelView }>()

useDashboardFonts()
</script>

<template>
  <section class="dash homelab-panel" aria-labelledby="homelab-status-title">
    <div class="card-h">
      <h2 id="homelab-status-title" class="card-title">
        <span :class="['dot', view.tone]" aria-hidden="true" />
        <span>homelab.status</span>
        <span class="device-label">{{ view.primary.name }}</span>
      </h2>
      <p class="card-meta">{{ view.summary }}</p>
    </div>

    <div class="kpi-grid">
      <div v-for="kpi in view.primary.kpis" :key="kpi.key" :class="['kpi', kpi.tone]">
        <div class="kpi-label">
          <span>{{ kpi.label }}</span>
          <span class="kpi-window">{{ kpi.window }}</span>
        </div>
        <div class="kpi-value">
          {{ kpi.value }}<span v-if="kpi.unit" class="unit">{{ kpi.unit }}</span>
        </div>
        <HomelabSpark class="kpi-spark" :values="kpi.history" :tone="kpi.tone" />
      </div>
    </div>

    <div v-if="view.nodes.length" class="node-grid">
      <div v-for="node in view.nodes" :key="node.id" :class="['node-tile', node.tone]">
        <div class="node-tile-h">
          <span class="node-name">{{ node.name }}</span>
          <span class="node-status">{{ node.status }}</span>
        </div>
        <div class="node-role">{{ node.role }}</div>
        <div class="node-meta">{{ node.meta }}</div>
        <div class="metric-chips">
          <span v-for="chip in node.chips" :key="chip.key" :class="['metric-chip', chip.tone]">
            <span>{{ chip.label }}</span>
            <b>{{ chip.value }}</b>
          </span>
        </div>
      </div>
    </div>

    <ul v-if="view.services.length" class="svc-list" aria-label="Services">
      <li v-for="service in view.services" :key="service.key" :class="['svc', service.tone]">
        <span class="svc-name">
          <span class="dot" aria-hidden="true" />
          <span class="svc-label">{{ service.node }} / {{ service.name }}</span>
        </span>
        <span class="stat">{{ service.detail }}</span>
      </li>
    </ul>
    <p v-else class="svc-empty">no services reported yet</p>

    <div v-if="$slots.footer" class="panel-foot">
      <slot name="footer" />
    </div>
  </section>
</template>
