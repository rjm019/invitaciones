import { readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import type { Plugin } from 'vite'
import { expandIncludes, faqJsonLd, fillTokens, sitemapXml, type SiteInfo } from './landingHtml'

/**
 * La landing son páginas HTML estáticas (todo el contenido en el HTML, para buscadores y
 * motores de respuestas). Este plugin:
 * - mete las piezas compartidas (`<!-- @include header.html -->`) y los datos del sitio
 *   (`%SITE_URL%`, `%BRAND%`…), y arma el JSON-LD de las preguntas frecuentes a partir de
 *   las preguntas de la página (así nunca se desfasan);
 * - en desarrollo, sirve cada página en su dirección bonita (`/` → `landing/index.html`),
 *   igual que Apache en producción (`deploy/apache-site.conf`);
 * - arma robots.txt, llms.txt y sitemap.xml con la dirección del sitio (SITE_URL): el día que
 *   cambie el dominio, basta con compilar con el nuevo.
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

/** Páginas que no van en el sitemap (no se indexan). */
const NOT_IN_SITEMAP = new Set(['/cotizacion-enviada'])

/** Archivos del sitio que se arman al compilar (y en desarrollo, al pedirlos). */
const SITE_FILES: Record<string, string> = {
  '/robots.txt': 'text/plain; charset=utf-8',
  '/llms.txt': 'text/plain; charset=utf-8',
  '/sitemap.xml': 'application/xml; charset=utf-8',
}

export function landingPlugin(root: string): Plugin {
  const dir = join(root, 'landing')
  const partials = join(dir, 'partials')
  const site = (): SiteInfo => ({
    ...(JSON.parse(readFileSync(join(dir, 'site.json'), 'utf8')) as Omit<SiteInfo, 'url'>),
    url: (process.env.SITE_URL || 'https://invitaciones-jiro.fly.dev').replace(/\/$/, ''),
  })

  /** robots.txt y llms.txt (plantillas en landing/) o el sitemap, ya con la dirección del sitio. */
  const siteFile = (path: string): string => {
    if (path !== '/sitemap.xml') return fillTokens(readFileSync(join(dir, path), 'utf8'), site())
    const pages = Object.entries(LANDING_ROUTES)
      .filter(([url]) => !NOT_IN_SITEMAP.has(url))
      .map(([url, file]) => ({
        path: url,
        modified: statSync(join(root, file)).mtime.toISOString().slice(0, 10),
      }))
    return sitemapXml(site(), pages)
  }

  return {
    name: 'landing',
    generateBundle() {
      for (const path of Object.keys(SITE_FILES)) {
        this.emitFile({ type: 'asset', fileName: path.slice(1), source: siteFile(path) })
      }
    },
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
      server.middlewares.use((req, res, next) => {
        const [path = '', query = ''] = (req.url ?? '').split('?')
        const type = SITE_FILES[path]
        if (type) {
          res.setHeader('Content-Type', type)
          res.end(siteFile(path))
          return
        }
        const target = LANDING_ROUTES[path]
        if (target) req.url = target + (query ? `?${query}` : '')
        next()
      })
    },
  }
}
