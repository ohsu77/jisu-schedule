import { defineConfig, type Plugin } from 'vite'
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// Serve/emit the pdfjs worker with a Promise.withResolvers polyfill prepended,
// so PDF parsing also works in the worker on iOS Safari < 17.4.
// Self-contained here (no external script) so it always runs on Vercel too.
function pdfWorkerWithPolyfill(): Plugin {
  const require = createRequire(import.meta.url)
  const polyfill =
    "if(typeof Promise.withResolvers!=='function'){" +
    'Promise.withResolvers=function(){var a,b;var p=new Promise(function(r,j){a=r;b=j;});' +
    'return{promise:p,resolve:a,reject:b};};}\n'
  let cached = ''
  const build = () => {
    if (!cached) {
      const p = require.resolve('pdfjs-dist/build/pdf.worker.min.mjs')
      cached = polyfill + readFileSync(p, 'utf8')
    }
    return cached
  }
  return {
    name: 'pdf-worker-with-polyfill',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === '/pdf.worker.min.mjs') {
          res.setHeader('Content-Type', 'text/javascript')
          res.end(build())
        } else next()
      })
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'pdf.worker.min.mjs', source: build() })
    },
  }
}

export default defineConfig({
  base: '/',
  plugins: [
    pdfWorkerWithPolyfill(),
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: '대한항공 스케줄',
        short_name: '대한항공',
        description: '근무표 PDF를 예쁜 달력으로 바꿔주는 앱',
        lang: 'ko',
        theme_color: '#4f46e5',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
        ],
      },
    }),
  ],
})
