import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Plugin } from 'vite'
import { expandIncludes, faqJsonLd, fillTokens, type SiteInfo } from './landingHtml'

/**
 * La landing son páginas HTML estáticas (todo el contenido en el HTML, para buscadores y
 * motores de respuestas). Este plugin:
 * - mete las piezas compartidas (`<!-- @include header.html -->`) y los datos del sitio
 *   (`%SITE_URL%`, `%BRAND%`…), y arma el JSON-LD de las preguntas frecuentes a partir de
 *   las preguntas de la página (así nunca se desfasan);
 * - en desarrollo, sirve cada página en su dirección bonita (`/` → `landing/index.html`),
 *   igual que Apache en producción (`deploy/apache-site.conf`).
 */

/** Dirección pública → archivo. La misma tabla vive en `deploy/apache-site.conf`. */
export const LANDING_ROUTES: Record<string, string> = {
  '/': '/landing/index.html',
  '/invitaciones-digitales-boda': '/landing/boda.html',
  '/invitaciones-digitales-xv-anos': '/landing/xv-anos.html',
  '/invitaciones-digitales-graduacion': '/landing/graduacion.html',
  '/aviso-de-privacidad': '/landing/privacidad.html',
  '/cotizacion-enviada': '/landing/enviada.html',
}

export function landingPlugin(root: string): Plugin {
  const dir = join(root, 'landing')
  const partials = join(dir, 'partials')
  const site = (): SiteInfo => ({
    ...(JSON.parse(readFileSync(join(dir, 'site.json'), 'utf8')) as Omit<SiteInfo, 'url'>),
    url: (process.env.SITE_URL || 'https://invitaciones-jiro.fly.dev').replace(/\/$/, ''),
  })

  return {
    name: 'landing',
    transformIndexHtml: {
      order: 'pre',
      handler(html, ctx) {
        if (!ctx.filename.includes('/landing/')) return html
        const expanded = expandIncludes(html, (name) => readFileSync(join(partials, name), 'utf8'))
        return faqJsonLd(fillTokens(expanded, site()))
      },
    },
    configureServer(server) {
      // Cambiar una pieza compartida recarga la página.
      server.watcher.add([partials, join(dir, 'site.json')])
      server.watcher.on('change', (file) => {
        if (file.startsWith(partials) || file.endsWith('site.json'))
          server.ws.send({ type: 'full-reload' })
      })
      server.middlewares.use((req, _res, next) => {
        const [path = '', query = ''] = (req.url ?? '').split('?')
        const target = LANDING_ROUTES[path]
        if (target) req.url = target + (query ? `?${query}` : '')
        next()
      })
    },
  }
}
