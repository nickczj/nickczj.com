import os from 'node:os'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  runtimeConfig: {
    public: {
      buildNodeVersion: process.version,
      buildBunVersion: (globalThis as any).Bun?.version ?? process.versions.bun ?? '',
      buildOsInfo: `${os.platform()} ${os.release()}`
    }
  },
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxt/content'],
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
      ignore: [/^\/$/],
      routes: ['/blog', '/now', '/uses', '/colophon']
    }
  }
})
