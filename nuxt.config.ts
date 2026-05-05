// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxt/content'],
  nitro: {
    prerender: {
      crawlLinks: true,
      ignore: [/^\/$/],
      routes: ['/blog', '/now', '/uses', '/colophon']
    }
  }
})
