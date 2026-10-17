import { describe, expect, it } from 'vitest'
import {
  expandIncludes,
  faqItems,
  faqJsonLd,
  fillTokens,
  sitemapXml,
  type SiteInfo,
} from '../landingHtml'

const site: SiteInfo = {
  url: 'https://jiro.test',
  brand: 'Jiro Solutions',
  responsible: 'Jiro Solutions',
  email: '',
  whatsapp: '5215512345678',
}

describe('landingHtml', () => {
  it('mete las piezas compartidas con sus parámetros', () => {
    const parts: Record<string, string> = {
      'form.html':
        '<option value="boda" {{tipo==boda}}>Boda</option><a {{tipo==boda|aria-current="page"}}></a><input value="{{pagina}}"><!-- @include nota.html -->',
      'nota.html': '<small>nota</small>',
    }
    const html = expandIncludes(
      '<main><!-- @include form.html tipo="boda" pagina="/bodas" --></main>',
      (n) => parts[n]!,
    )
    expect(html).toBe(
      '<main><option value="boda" selected>Boda</option><a aria-current="page"></a><input value="/bodas"><small>nota</small></main>',
    )
    expect(expandIncludes('<!-- @include form.html -->', (n) => parts[n]!)).toContain(
      '<option value="boda" >Boda</option>',
    )
    expect(() =>
      expandIncludes('<!-- @include a.html -->', () => '<!-- @include a.html -->'),
    ).toThrow()
  })

  it('rellena los datos del sitio y quita lo que depende de un dato vacío', () => {
    const html = fillTokens(
      '<a href="%SITE_URL%/">%BRAND%</a><!-- @if email --><a>%EMAIL%</a><!-- @endif --><!-- @if whatsapp --><a href="https://wa.me/%WHATSAPP%">WhatsApp</a><!-- @endif -->© %YEAR% 50%',
      site,
      new Date('2026-10-15T12:00:00Z'),
    )
    expect(html).toBe(
      '<a href="https://jiro.test/">Jiro Solutions</a><a href="https://wa.me/5215512345678">WhatsApp</a>© 2026 50%',
    )
  })

  it('pone los códigos de verificación y las redes solo si existen', () => {
    const page =
      '<!-- @if google_verification --><meta name="google-site-verification" content="%GOOGLE_VERIFICATION%" /><!-- @endif --><!-- @if bing_verification --><meta name="msvalidate.01" content="%BING_VERIFICATION%" /><!-- @endif -->"sameAs": %SAME_AS%<!-- @if otra -->queda<!-- @endif -->'
    expect(fillTokens(page, site)).toBe('"sameAs": []<!-- @if otra -->queda<!-- @endif -->')
    expect(
      fillTokens(page, {
        ...site,
        google_verification: 'abc123',
        redes: ['https://instagram.com/jiro', 'javascript:alert(1)'],
      }),
    ).toBe(
      '<meta name="google-site-verification" content="abc123" />"sameAs": ["https://instagram.com/jiro"]<!-- @if otra -->queda<!-- @endif -->',
    )
  })

  it('el robots de la cabecera cambia con el parámetro de la pieza', () => {
    const head = (name: string) =>
      name === 'head.html' ? '{{robots==|<meta name="robots" content="index, follow" />}}' : ''
    expect(expandIncludes('<!-- @include head.html -->', head)).toBe(
      '<meta name="robots" content="index, follow" />',
    )
    expect(expandIncludes('<!-- @include head.html robots="noindex" -->', head)).toBe('')
  })

  it('arma el sitemap con la dirección del sitio', () => {
    expect(
      sitemapXml(site, [
        { path: '/', modified: '2026-10-17' },
        { path: '/invitaciones-digitales-boda', modified: '2026-10-15' },
      ]),
    ).toBe(
      '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
        '  <url><loc>https://jiro.test/</loc><lastmod>2026-10-17</lastmod></url>\n' +
        '  <url><loc>https://jiro.test/invitaciones-digitales-boda</loc><lastmod>2026-10-15</lastmod></url>\n' +
        '</urlset>\n',
    )
  })

  it('arma el JSON-LD de las preguntas de la página', () => {
    const page = `<html><head></head><body>
      <details class="faq__item"><summary>¿Qué es una <em>invitación digital</em>?</summary>
        <div class="faq__a"><p>Una página que llega por WhatsApp &amp; se abre sin app.</p></div></details>
      <details class="faq__item"><summary>¿Hay <b>precio</b>?</summary><p>Cotizamos a la medida.</p></details>
    </body></html>`
    expect(faqItems(page)).toEqual([
      {
        question: '¿Qué es una invitación digital?',
        answer: 'Una página que llega por WhatsApp & se abre sin app.',
      },
      { question: '¿Hay precio?', answer: 'Cotizamos a la medida.' },
    ])
    const out = faqJsonLd(page)
    const json = /<script type="application\/ld\+json">(.*)<\/script>/.exec(out)![1]!
    expect(JSON.parse(json)).toMatchObject({
      '@type': 'FAQPage',
      mainEntity: [{ name: '¿Qué es una invitación digital?' }, {}],
    })
    expect(faqJsonLd('<head></head><p>sin preguntas</p>')).toBe('<head></head><p>sin preguntas</p>')
  })
})
