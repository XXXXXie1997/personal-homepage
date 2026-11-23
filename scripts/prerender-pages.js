import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { build } from 'vite'
import vue from '@vitejs/plugin-vue'

const routes = ['/', '/projects', '/cv']

// Bake each route with the same Vue components and scoped styles used by the client.
export function prerenderPages() {
  let config
  return {
    name: 'prerender-pages',
    configResolved(resolved) { config = resolved },
    configurePreviewServer(server) {
      server.middlewares.use((req, _res, next) => {
        const url = new URL(req.url, 'http://localhost')
        const path = url.pathname.slice(config.base.length - 1)
        if (path !== '/' && routes.includes(path)) req.url = url.pathname + '/index.html' + url.search
        next()
      })
    },
    generateBundle: {
      order: 'post',
      async handler(_, bundle) {
        const outDir = resolve(config.cacheDir, 'homepage-ssr')
        await build({
          root: config.root, configFile: false, plugins: [vue()], publicDir: false,
          logLevel: 'warn', mode: config.mode,
          build: {
            ssr: 'src/prerender.js', outDir,
            rollupOptions: { output: { entryFileNames: 'render.mjs' } }
          }
        })
        const { renderPage } = await import(pathToFileURL(resolve(outDir, 'render.mjs')).href + '?t=' + Date.now())
        const entry = bundle['index.html']
        const template = entry.source.replace(/<link rel="stylesheet"[^>]* href="([^"]+)"[^>]*>/g, (_, href) => {
          const css = bundle[href.slice(config.base.length)].source
          return '<style>' + css + '</style>'
        })
        for (const route of routes) {
          const content = await renderPage(route, config.base)
          const source = template.replace('<div id="app"></div>', () =>
            '<div id="app" data-route="' + route + '">' + content + '</div>')
          if (route === '/') entry.source = source
          else this.emitFile({ type: 'asset', fileName: route.slice(1) + '/index.html', source })
        }
      }
    }
  }
}
