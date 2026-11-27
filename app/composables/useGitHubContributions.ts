/**
 * GitHub contribution calendar for the last 12 months. Fetched in the browser,
 * so a page never waits on GitHub to render.
 */
export function useGitHubContributions() {
  const { data, status } = useFetch('/api/github/contributions', {
    key: 'github-contributions',
    server: false,
    lazy: true
  })

  const contributions = computed(() => {
    const value = data.value
    return value && !('unavailable' in value) ? value : null
  })

  return { contributions, status }
}
