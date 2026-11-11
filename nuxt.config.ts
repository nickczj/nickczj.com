import os from 'node:os'
import { execSync } from 'node:child_process'

function detectBunVersion(): string {
  try {
    return execSync('bun --version', { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
  } catch {
    return ''
  }
}

function detectGitCommit(): string {
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
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
      buildOsInfo: `${os.platform()} ${os.release()}`,
      buildCommitHash: detectGitCommit()
    }
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
      routes: ['/blog', '/now', '/uses', '/colophon']
    }
  }
})
