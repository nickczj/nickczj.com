<script setup lang="ts">
</script>

<template>
  <div class="topology-card">
    <svg viewBox="0 0 400 160" fill="none" xmlns="http://www.w3.org/2000/svg" class="topology-svg">
      <!-- Arrow line: Battery → ESP32 → Adapter → Display -->
      <line x1="72" y1="52" x2="128" y2="52" stroke="var(--rule)" stroke-width="1.5" marker-end="url(#arrow)" />
      <line x1="200" y1="52" x2="256" y2="52" stroke="var(--rule)" stroke-width="1.5" marker-end="url(#arrow)" />
      <line x1="328" y1="52" x2="370" y2="52" stroke="var(--rule)" stroke-width="1.5" marker-end="url(#arrow)" />

      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--muted)" />
        </marker>
      </defs>

      <!-- Battery -->
      <rect x="8" y="24" width="64" height="56" rx="6" fill="var(--bg)" stroke="var(--rule)" stroke-width="1" />
      <text x="40" y="48" text-anchor="middle" fill="var(--heading)" font-size="10" font-weight="700">5000mAh</text>
      <text x="40" y="64" text-anchor="middle" fill="var(--muted)" font-size="9">3.7V LiPo</text>

      <!-- ESP32 -->
      <rect x="132" y="24" width="68" height="56" rx="6" fill="var(--bg)" stroke="var(--rule)" stroke-width="1" />
      <text x="166" y="48" text-anchor="middle" fill="var(--heading)" font-size="10" font-weight="700">FireBeetle 2</text>
      <text x="166" y="64" text-anchor="middle" fill="var(--muted)" font-size="9">ESP32-E</text>

      <!-- DESPI-C02 -->
      <rect x="260" y="24" width="68" height="56" rx="6" fill="var(--bg)" stroke="var(--rule)" stroke-width="1" />
      <text x="294" y="48" text-anchor="middle" fill="var(--heading)" font-size="10" font-weight="700">DESPI-C02</text>
      <text x="294" y="64" text-anchor="middle" fill="var(--muted)" font-size="9">Adapter</text>

      <!-- Display -->
      <rect x="332" y="24" width="60" height="56" rx="6" fill="var(--bg)" stroke="var(--rule)" stroke-width="1" />
      <text x="362" y="48" text-anchor="middle" fill="var(--heading)" font-size="10" font-weight="700">Heltec</text>
      <text x="362" y="64" text-anchor="middle" fill="var(--muted)" font-size="9">Wireless Paper</text>

      <!-- Description below -->
      <text x="200" y="110" text-anchor="middle" fill="var(--muted)" font-size="9">ESPHome-native e-ink display for Home Assistant dashboards</text>
      <text x="200" y="128" text-anchor="middle" fill="var(--muted)" font-size="9">Low power · partial refresh · deep sleep</text>

      <!-- WiFi icon -->
      <text x="200" y="150" text-anchor="middle" fill="var(--link)" font-size="9">⬡ WiFi 4 + BLE 5</text>
    </svg>
  </div>
</template>

<style scoped>
.topology-card {
  width: 100%;
  aspect-ratio: 16 / 9;
  background: var(--bg);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-bottom: 1px solid var(--rule);
}

.topology-svg {
  width: 100%;
  height: 100%;
  padding: 4px 8px;
  box-sizing: border-box;
}
</style>
