/**
 * JetBrains Mono for the homelab panel and terminal. Only pages that show
 * them load it; the keys stop the two components adding it twice.
 */
export function useDashboardFonts() {
  useHead({
    link: [
      { key: 'dash-font-preconnect', rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
      {
        key: 'dash-font',
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400..700&display=swap'
      }
    ]
  })
}
