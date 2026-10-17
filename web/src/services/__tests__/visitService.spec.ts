import { describe, expect, it, vi } from 'vitest'
import { trackVisit, visitPayload, type VisitWindow } from '../visitService'

function fakeWindow(over: Partial<VisitWindow> = {}, session: string | null = null) {
  const sendBeacon = vi.fn<(url: string, body?: BodyInit | null) => boolean>(() => true)
  const win: VisitWindow = {
    location: {
      pathname: '/invitaciones-digitales-boda',
      search: '?utm_source=ig&utm_campaign=otoño',
    },
    document: { referrer: 'https://l.instagram.com/' },
    navigator: { webdriver: false, sendBeacon },
    localStorage: { getItem: (key: string) => (key === 'gestor:sesion' ? session : null) },
    ...over,
  }
  return { win, sendBeacon }
}

async function sentBody(spy: ReturnType<typeof vi.fn>): Promise<unknown> {
  const body = spy.mock.calls[0]?.[1] as Blob
  expect(body.type).toBe('text/plain;charset=utf-8')
  return JSON.parse(await body.text())
}

describe('visitService', () => {
  it('arma el aviso con la página, de dónde llegó y las etiquetas del enlace', () => {
    expect(
      visitPayload({
        pathname: '/',
        search: '?utm_source=%20qr%20&utm_medium=volante&otro=1',
        referrer: 'https://www.google.com/',
      }),
    ).toEqual({
      pagina: '/',
      ref: 'https://www.google.com/',
      utm_source: 'qr',
      utm_medium: 'volante',
    })
    expect(visitPayload({ pathname: '', search: '', referrer: '' })).toEqual({ pagina: '/' })
  })

  it('nunca manda el token de un enlace personal', () => {
    const payload = visitPayload({
      pathname: '/i/Fam1Token001',
      search: '',
      referrer: '',
      event: 'nat',
      demo: true,
    })
    expect(payload).toEqual({ pagina: '/i', evento: 'nat', muestra: true })
    expect(JSON.stringify(payload)).not.toContain('Fam1Token001')
  })

  it('lo manda con sendBeacon, como texto', async () => {
    const { win, sendBeacon } = fakeWindow()
    expect(trackVisit(win)).toBe(true)
    expect(sendBeacon).toHaveBeenCalledWith('/api/public/visits', expect.any(Blob))
    expect(await sentBody(sendBeacon)).toEqual({
      pagina: '/invitaciones-digitales-boda',
      ref: 'https://l.instagram.com/',
      utm_source: 'ig',
      utm_campaign: 'otoño',
    })
  })

  it('marca las visitas del equipo (con sesión del gestor) y usa la dirección de la API', async () => {
    const { win, sendBeacon } = fakeWindow({}, '{"token":"x"}')
    trackVisit(win, { event: 'nat' }, 'https://api.ejemplo.mx')
    expect(sendBeacon.mock.calls[0]?.[0]).toBe('https://api.ejemplo.mx/api/public/visits')
    expect(await sentBody(sendBeacon)).toMatchObject({ evento: 'nat', equipo: true })
  })

  it('sin sendBeacon usa fetch con keepalive', () => {
    const fetcher = vi.fn(() => Promise.resolve(new Response(null, { status: 204 })))
    const { win } = fakeWindow({
      navigator: { webdriver: false },
      fetch: fetcher as unknown as typeof fetch,
    })
    expect(trackVisit(win)).toBe(true)
    expect(fetcher).toHaveBeenCalledWith(
      '/api/public/visits',
      expect.objectContaining({ method: 'POST', keepalive: true }),
    )
  })

  it('los navegadores automatizados no cuentan y nada lanza un error', () => {
    const sendBeacon = vi.fn()
    const { win } = fakeWindow({ navigator: { webdriver: true, sendBeacon } })
    expect(trackVisit(win)).toBe(false)
    expect(sendBeacon).not.toHaveBeenCalled()

    const broken = fakeWindow({
      localStorage: {
        getItem: () => {
          throw new Error('bloqueado')
        },
      },
    })
    expect(trackVisit(broken.win)).toBe(true)
  })
})
