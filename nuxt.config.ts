import os from 'node:os'
import { execSync } from 'node:child_process'

function detectBunVersion(): string {
  try {
    return execSync('bun --version', { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
  } catch {
    return ''
  }
}

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  runtimeConfig: {
    public: {
      buildNodeVersion: process.version,
      buildBunVersion: detectBunVersion(),
      buildOsInfo: `${os.platform()} ${os.release()}`
    }
  },
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxt/content'],
  css: ['katex/dist/katex.min.css'],
  app: {
    head: {
      meta: [
        { name: 'color-scheme', content: 'light dark' }
      ],
      script: [
        {
          innerHTML: `(function(){try{var p=localStorage.getItem('theme-pref');var t;if(p==='dark'||p==='light'){t=p}else{t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}document.documentElement.setAttribute('data-theme',t)}catch(e){}})();`,
          tagPriority: 'high'
        }
      ]
    }
  },
  nitro: {
    prerender: {
      crawlLinks: true,
      ignore: [/^\/$/, /^\/projects/],
      routes: ['/blog', '/now', '/uses', '/colophon']
    }
  }
})
