<script setup lang="ts">
// "Right now" on /now. Reading comes from content/currently/ and is part of
// the prerendered page; Spotify and the weather load in the browser and only
// appear when there is something real to show.
const { data: reading } = useCurrentlyReading()
const { track } = useSpotifyNow({ pollMs: 60_000 })
const { weather } = useSingaporeWeather()

type Row = { label: string; value: string; href?: string }

const rows = computed<Row[]>(() => {
  const list: Row[] = []

  if (reading.value) {
    const { book, author, chapter, link } = reading.value
    list.push({
      label: 'Reading',
      value: [`${book} by ${author}`, chapter].filter(Boolean).join(', '),
      href: link || undefined
    })
  }

  if (track.value) {
    list.push({
      label: 'Listening to',
      value: [track.value.artist, track.value.track].filter(Boolean).join(' — '),
      href: track.value.url
    })
  }

  if (weather.value) {
    const { temperature, condition, pm25 } = weather.value
    list.push({
      label: 'In Singapore',
      value: `${temperature}°C, ${condition}${pm25 === null ? '' : ` · PM2.5 ${pm25}`}`
    })
  }

  return list
})
</script>

<template>
  <section v-if="rows.length" class="currently" aria-labelledby="currently-title">
    <h2 id="currently-title" class="currently-title">Right now</h2>
    <dl class="currently-list">
      <div v-for="row in rows" :key="row.label" class="currently-row">
        <dt>{{ row.label }}</dt>
        <dd>
          <a v-if="row.href" :href="row.href" target="_blank" rel="noopener">{{ row.value }}</a>
          <template v-else>{{ row.value }}</template>
        </dd>
      </div>
    </dl>
  </section>
</template>

<style scoped>
.currently {
  display: grid;
  gap: 0.65rem;
  max-width: 44rem;
  padding: 1rem 1.15rem;
  border: 1px solid var(--rule);
  border-radius: 0.5rem;
}

.currently-title {
  margin: 0;
  color: var(--eyebrow);
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0;
  text-transform: uppercase;
}

.currently-list {
  display: grid;
  gap: 0.45rem;
  margin: 0;
}

.currently-row {
  display: grid;
  grid-template-columns: 7.5rem minmax(0, 1fr);
  gap: 1rem;
  align-items: baseline;
}

.currently-row dt {
  color: var(--muted);
  font-size: 0.88rem;
}

.currently-row dd {
  margin: 0;
  color: var(--prose);
  line-height: 1.5;
  overflow-wrap: anywhere;
}

@media (max-width: 480px) {
  .currently-row {
    grid-template-columns: minmax(0, 1fr);
    gap: 0.1rem;
  }
}
</style>
