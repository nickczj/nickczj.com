type Theme = 'light' | 'dark'

const theme = ref<Theme>('light')
let mql: MediaQueryList | null = null

function apply(dom: HTMLElement, value: Theme) {
  dom.setAttribute('data-theme', value)
}

function save(value: Theme) {
  try { localStorage.setItem('theme-pref', value) } catch { /* noop */ }
}

function toggle() {
  if (!import.meta.client) return
  const dom = document.documentElement
  dom.classList.add('theme-transitioning')
  const next = dom.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'
  apply(dom, next)
  save(next)
  theme.value = next
  requestAnimationFrame(() => {
    requestAnimationFrame(() => dom.classList.remove('theme-transitioning'))
  })
}

function init() {
  if (!import.meta.client) return
  const current = document.documentElement.getAttribute('data-theme') as Theme | null
  if (current === 'dark' || current === 'light') theme.value = current
}

function listen() {
  if (!import.meta.client) return
  mql = window.matchMedia('(prefers-color-scheme: dark)')
  mql.addEventListener('change', (e) => {
    try {
      if (localStorage.getItem('theme-pref')) return
    } catch { return }
    const next: Theme = e.matches ? 'dark' : 'light'
    apply(document.documentElement, next)
    theme.value = next
  })
}

export function useTheme() {
  return { theme, init, toggle, listen }
}
