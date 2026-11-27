/** What I'm reading, from content/currently/. */
export function useCurrentlyReading() {
  return useAsyncData('currently-reading', () =>
    queryCollection('currently').where('draft', '=', false).first()
  )
}
