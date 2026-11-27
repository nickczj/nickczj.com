import { fileURLToPath } from 'node:url'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  runtimeConfig: {
    public: {
      // R2 bucket `nickczj-media` on its custom domain. For local previews of
      // photos processed into .cache/watch-photos, run dev with
      // NUXT_PUBLIC_MEDIA_BASE_URL=/_media.
      mediaBaseUrl: 'https://media.nickczj.com'
    }
  },
  $development: {
    nitro: {
      publicAssets: [
        {
          baseURL: '/_media',
          dir: fileURLToPath(new URL('./.cache/watch-photos', import.meta.url)),
          maxAge: 0
        },
        // Reference images for homepage experiments (gitignored, dev only).
        {
          baseURL: '/_refs',
          dir: fileURLToPath(new URL('./.design-refs', import.meta.url)),
          maxAge: 0
        }
      ]
    }
  },
  // Homepage experiments under app/pages/lab/ are dev-only: production builds
  // (build, generate, typecheck) never see them. Patterns are relative to the
  // repo root.
  $production: {
    ignore: ['app/pages/lab/**']
  },
  compatibilityDate: '2026-11-01',
  devtools: { enabled: true },
  // Nitro emits these into dist/_headers for Cloudflare Pages.
  routeRules: {
    '/**': {
      headers: {
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'strict-origin-when-cross-origin'
      }
    },
    '/dump.*.sql': {
      headers: {
        'X-Robots-Tag': 'noindex'
      }
    },
    '/__nuxt_content/**': {
      headers: {
        'X-Robots-Tag': 'noindex'
      }
    }
  },
  modules: ['@nuxt/content'],
  mdc: {
    components: {
      map: {
        cite: 'Cite'
      }
    }
  },
  css: ['katex/dist/katex.min.css', '~/assets/css/katex.css', '~/assets/css/math-def.css', '~/assets/css/cite.css'],
  content: {
    build: {
      markdown: {
        remarkPlugins: {
          'remark-math': {
            options: {
              singleDollarTextMath: true
            }
          }
        },
        rehypePlugins: {
          'rehype-katex': {
            options: {
              trust: (ctx: { command?: string }) => ctx.command === '\\htmlClass',
              strict: 'ignore'
            }
          }
        }
      }
    }
  },
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
      routes: ['/blog', '/now', '/uses', '/colophon', '/watches', '/watches/admired']
    }
  }
})
