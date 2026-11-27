/**
 * The track playing on Spotify right now, or null when nothing is playing or
 * Spotify is unreachable. Fetched in the browser; pass pollMs to keep it fresh.
 */
export function useSpotifyNow(options: { pollMs?: number } = {}) {
  const { data, refresh } = useFetch('/api/spotify/now', {
    key: 'spotify-now',
    server: false,
    lazy: true
  })

  const track = computed(() => {
    const value = data.value
    if (!value?.playing || !value.track) return null
    return { track: value.track, artist: value.artist, url: value.url || undefined }
  })

  let timer: ReturnType<typeof setInterval> | undefined
  onMounted(() => {
    if (options.pollMs) timer = setInterval(() => { refresh() }, options.pollMs)
  })
  onBeforeUnmount(() => clearInterval(timer))

  return { track, refresh }
}
