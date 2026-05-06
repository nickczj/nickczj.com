<script setup lang="ts">
</script>

<template>
  <div class="topology-card">
    <svg viewBox="0 0 400 160" fill="none" xmlns="http://www.w3.org/2000/svg" class="topology-svg">
      <!-- Tailscale connecting line -->
      <line x1="67" y1="70" x2="333" y2="70" stroke="var(--rule)" stroke-width="1.5" stroke-dasharray="4 3" />
      <line x1="200" y1="70" x2="200" y2="30" stroke="var(--rule)" stroke-width="1.5" stroke-dasharray="4 3" />

      <!-- Tailscale label at top -->
      <rect x="161" y="12" width="78" height="22" rx="6" fill="var(--bg)" stroke="var(--tag-border)" stroke-width="1" />
      <text x="200" y="27" text-anchor="middle" fill="var(--link)" font-size="10" font-weight="700">Tailscale</text>

      <!-- Pi 5 node -->
      <rect x="10" y="48" width="114" height="80" rx="8" fill="var(--bg)" stroke="var(--rule)" stroke-width="1" />
      <text x="67" y="72" text-anchor="middle" fill="var(--heading)" font-size="12" font-weight="700">Raspberry Pi 5</text>
      <text x="67" y="90" text-anchor="middle" fill="var(--muted)" font-size="9">Pi-hole DNS</text>
      <text x="67" y="104" text-anchor="middle" fill="var(--muted)" font-size="9">Docker · Traefik</text>
      <text x="67" y="118" text-anchor="middle" fill="var(--muted)" font-size="9">Immich · Jellyfin</text>

      <!-- Ugreen NAS node -->
      <rect x="143" y="48" width="114" height="80" rx="8" fill="var(--bg)" stroke="var(--rule)" stroke-width="1" />
      <text x="200" y="72" text-anchor="middle" fill="var(--heading)" font-size="12" font-weight="700">Ugreen NAS</text>
      <text x="200" y="90" text-anchor="middle" fill="var(--muted)" font-size="9">Media Storage</text>
      <text x="200" y="104" text-anchor="middle" fill="var(--muted)" font-size="9">Paperless · Beszel</text>
      <text x="200" y="118" text-anchor="middle" fill="var(--muted)" font-size="9">Suwayomi · Backups</text>

      <!-- HA Yellow node -->
      <rect x="276" y="48" width="114" height="80" rx="8" fill="var(--bg)" stroke="var(--rule)" stroke-width="1" />
      <text x="333" y="72" text-anchor="middle" fill="var(--heading)" font-size="12" font-weight="700">HA Yellow</text>
      <text x="333" y="90" text-anchor="middle" fill="var(--muted)" font-size="9">CM5 Module</text>
      <text x="333" y="104" text-anchor="middle" fill="var(--muted)" font-size="9">Home Assistant</text>
      <text x="333" y="118" text-anchor="middle" fill="var(--muted)" font-size="9">Zigbee · Thread</text>

      <!-- Status dots -->
      <circle cx="35" cy="144" r="3" fill="var(--link)" />
      <text x="42" y="147" fill="var(--muted)" font-size="9">online</text>
      <circle cx="168" cy="144" r="3" fill="var(--link)" />
      <text x="175" y="147" fill="var(--muted)" font-size="9">online</text>
      <circle cx="301" cy="144" r="3" fill="var(--link)" />
      <text x="308" y="147" fill="var(--muted)" font-size="9">online</text>
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
