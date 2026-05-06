<script setup lang="ts">
</script>

<template>
  <div class="topology-card">
    <svg viewBox="0 0 400 160" fill="none" xmlns="http://www.w3.org/2000/svg" class="topology-svg">
      <defs>
        <marker id="eink-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--muted)" />
        </marker>
      </defs>

      <!-- Top row: power → controller → panel -->
      <line x1="72" y1="42" x2="128" y2="42" stroke="var(--rule)" stroke-width="1.5" marker-end="url(#eink-arrow)" />
      <line x1="200" y1="42" x2="256" y2="42" stroke="var(--rule)" stroke-width="1.5" marker-end="url(#eink-arrow)" />

      <!-- 18650 Battery -->
      <rect x="8" y="14" width="64" height="56" rx="6" fill="var(--bg)" stroke="var(--rule)" stroke-width="1" />
      <text x="40" y="38" text-anchor="middle" fill="var(--heading)" font-size="10" font-weight="700">18650</text>
      <text x="40" y="54" text-anchor="middle" fill="var(--muted)" font-size="9">Li-Ion</text>

      <!-- ESP32 Driver -->
      <rect x="132" y="14" width="68" height="56" rx="6" fill="var(--bg)" stroke="var(--rule)" stroke-width="1" />
      <text x="166" y="38" text-anchor="middle" fill="var(--heading)" font-size="10" font-weight="700">ESP32-S3</text>
      <text x="166" y="54" text-anchor="middle" fill="var(--muted)" font-size="9">Driver Board</text>

      <!-- Spectra 6 Panel -->
      <rect x="260" y="14" width="68" height="56" rx="6" fill="var(--bg)" stroke="var(--rule)" stroke-width="1" />
      <text x="294" y="38" text-anchor="middle" fill="var(--heading)" font-size="10" font-weight="700">Spectra 6</text>
      <text x="294" y="54" text-anchor="middle" fill="var(--muted)" font-size="9">7.3" · 800x480</text>

      <!-- Bitmap server → cloud connection -->
      <line x1="352" y1="42" x2="370" y2="42" stroke="var(--rule)" stroke-width="1.5" stroke-dasharray="4 3" marker-end="url(#eink-arrow)" />
      <rect x="340" y="14" width="52" height="56" rx="6" fill="var(--bg)" stroke="var(--tag-border)" stroke-width="1" />
      <text x="366" y="38" text-anchor="middle" fill="var(--link)" font-size="10" font-weight="700">Bitmap</text>
      <text x="366" y="54" text-anchor="middle" fill="var(--link)" font-size="9">Server</text>

      <!-- Bottom description -->
      <text x="200" y="98" text-anchor="middle" fill="var(--muted)" font-size="9">6-color ACeP panel · 15s full refresh · ~3 months per charge</text>
      <text x="200" y="116" text-anchor="middle" fill="var(--muted)" font-size="9">Push-based rendering: server → pre-rendered bitmap → ESP32 → panel</text>

      <!-- Color dots for Spectra 6 -->
      <g transform="translate(128, 130)">
        <circle cx="0" cy="0" r="4" fill="#1a1a1a" /><text x="7" y="3" fill="var(--muted)" font-size="8">B/W/R/Y/B/G</text>
        <circle cx="20" cy="0" r="4" fill="#e74c3c" />
        <circle cx="40" cy="0" r="4" fill="#f1c40f" />
        <circle cx="60" cy="0" r="4" fill="#3498db" />
        <circle cx="80" cy="0" r="4" fill="#2ecc71" />
      </g>
      <text x="200" y="152" text-anchor="middle" fill="var(--muted)" font-size="8">6-color palette</text>
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
