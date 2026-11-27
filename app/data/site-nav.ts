// Primary navigation, shared by the site layout, the homepage and the
// homelab terminal so the three never drift apart.
export const SITE_NAV = [
  { label: 'Blog', to: '/blog' },
  { label: 'Projects', to: '/projects' },
  { label: 'Now', to: '/now' },
  { label: 'Uses', to: '/uses' },
  { label: 'Watches', to: '/watches' }
] as const

export const CV_URL = 'https://cv.nickczj.com'
