import { describe, expect, it } from 'vitest'
import type { InvitationAlbum } from '@/types/invitation'
import {
  albumErrorMessage,
  albumFileName,
  albumTarget,
  albumView,
  albumWindow,
  clampAlbumDays,
  formatBytes,
  isImageFile,
  uploadTitle,
  usageLabel,
  usageWarning,
} from '../albumService'

const TZ = 'America/Mexico_City'
const STARTS = '2026-11-28T17:00:00-06:00'
const at = (iso: string, days = 5) => albumWindow(STARTS, TZ, days, new Date(iso))

describe('albumWindow (espejo del servidor)', () => {
  it('antes del día del evento no se sube', () => {
    expect(at('2026-11-27T23:59:59-06:00')?.state).toBe('before')
  })

  it('desde las 00:00 del día del evento se sube', () => {
    expect(at('2026-11-28T00:00:00-06:00')?.state).toBe('event_day')
    expect(at('2026-11-28T23:59:59-06:00')?.state).toBe('event_day')
  })

  it('del día siguiente al día N sigue abierto y se ve el álbum', () => {
    expect(at('2026-11-29T00:00:00-06:00')?.state).toBe('after')
    expect(at('2026-12-03T23:59:59-06:00')?.state).toBe('after')
    expect(at('2026-12-03T23:59:59-06:00')?.lastDay).toBe('2026-12-03')
  })

  it('al terminar el día N cierra', () => {
    expect(at('2026-12-04T00:00:00-06:00')?.state).toBe('closed')
  })

  it('lo calcula en la zona del evento, no en la del visitante', () => {
    // En UTC ya es 28-nov 02:00, pero en México todavía es 27-nov.
    expect(at('2026-11-28T02:00:00Z')?.state).toBe('before')
    // 04-dic 05:00 UTC = 03-dic 23:00 en México: aún abierto.
    expect(at('2026-12-04T05:00:00Z')?.state).toBe('after')
    expect(at('2026-12-04T06:00:00Z')?.state).toBe('closed')
  })

  it('acota los días a 5–20 igual que el servidor', () => {
    expect(clampAlbumDays(undefined)).toBe(5)
    expect(clampAlbumDays('2')).toBe(5)
    expect(clampAlbumDays(12)).toBe(12)
    expect(clampAlbumDays(99)).toBe(20)
    expect(at('2026-12-18T23:59:59-06:00', 99)?.state).toBe('after')
    expect(at('2026-12-19T00:00:00-06:00', 99)?.state).toBe('closed')
    expect(at('2026-12-04T00:00:00-06:00', 1)?.state).toBe('closed')
  })

  it('sin fecha de inicio no hay calendario', () => {
    expect(albumWindow(null, TZ, 5)).toBeNull()
  })
})

const server = (patch: Partial<InvitationAlbum> = {}): InvitationAlbum => ({
  state: 'event_day',
  can_upload: true,
  used: 0,
  remaining: 2,
  max: 2,
  closes_at: null,
  last_day: '2026-12-03',
  ...patch,
})

describe('albumView', () => {
  const window = at('2026-11-28T12:00:00-06:00')

  it('antes del día: solo el aviso', () => {
    const v = albumView({
      window: at('2026-11-20T12:00:00-06:00'),
      server: undefined,
      hasInvitation: true,
      demo: false,
      simulatedUsed: 0,
    })
    expect(v).toMatchObject({ mode: 'before', canUpload: false, showPhotos: false })
  })

  it('el día del evento: sube, sin mostrar aún el álbum', () => {
    const v = albumView({
      window,
      server: server(),
      hasInvitation: true,
      demo: false,
      simulatedUsed: 0,
    })
    expect(v).toMatchObject({ mode: 'upload', canUpload: true, remaining: 2, showPhotos: false })
  })

  it('manda el servidor: sin lugares ya no sube', () => {
    const v = albumView({
      window,
      server: server({ remaining: 0, used: 2, can_upload: false }),
      hasInvitation: true,
      demo: false,
      simulatedUsed: 0,
    })
    expect(v.canUpload).toBe(false)
    expect(uploadTitle(v.remaining)).toBe('¡Gracias por tus fotos!')
  })

  it('después del evento muestra las elegidas', () => {
    const v = albumView({
      window: at('2026-11-30T12:00:00-06:00'),
      server: server({ state: 'after' }),
      hasInvitation: true,
      demo: false,
      simulatedUsed: 0,
    })
    expect(v).toMatchObject({ mode: 'upload', showPhotos: true })
  })

  it('en la invitación general no se sube', () => {
    const v = albumView({
      window: at('2026-11-30T12:00:00-06:00'),
      server: undefined,
      hasInvitation: false,
      demo: false,
      simulatedUsed: 0,
    })
    expect(v).toMatchObject({ canUpload: false, showPhotos: true })
  })

  it('una muestra siempre está abierta y descuenta lo que simula', () => {
    const none = albumView({
      window: null,
      server: undefined,
      hasInvitation: true,
      demo: true,
      simulatedUsed: 0,
    })
    expect(none).toMatchObject({ mode: 'upload', canUpload: true, remaining: 2, showPhotos: true })
    const full = albumView({
      window: null,
      server: undefined,
      hasInvitation: true,
      demo: true,
      simulatedUsed: 2,
    })
    expect(full).toMatchObject({ canUpload: false, remaining: 0 })
  })

  it('cerrado', () => {
    const v = albumView({
      window: at('2026-12-10T12:00:00-06:00'),
      server: undefined,
      hasInvitation: true,
      demo: false,
      simulatedUsed: 0,
    })
    expect(v.mode).toBe('closed')
  })
})

describe('textos y archivos', () => {
  it('"Sube tus fotos (te quedan 2)"', () => {
    expect(uploadTitle(2)).toBe('Sube tus fotos (te quedan 2)')
    expect(uploadTitle(1)).toBe('Sube tus fotos (te queda 1)')
  })

  it('reduce a 1600 px de lado mayor', () => {
    expect(albumTarget(4000, 3000)).toEqual({ width: 1600, height: 1200 })
    expect(albumTarget(3000, 4000)).toEqual({ width: 1200, height: 1600 })
    expect(albumTarget(800, 600)).toEqual({ width: 800, height: 600 })
  })

  it('siempre sube como JPEG (HEIC incluido)', () => {
    expect(albumFileName('IMG_0001.HEIC')).toBe('IMG_0001.jpg')
    expect(isImageFile({ type: '', name: 'IMG_0001.heic' })).toBe(true)
    expect(isImageFile({ type: 'application/pdf', name: 'a.pdf' })).toBe(false)
  })

  it('errores en español', () => {
    expect(albumErrorMessage(410, 'x')).toBe('Este evento ya terminó. ¡Gracias por acompañarnos!')
    expect(albumErrorMessage(507, 'El álbum ya está lleno')).toBe('El álbum ya está lleno')
    expect(albumErrorMessage(429, '')).toMatch(/muy rápido/)
    expect(albumErrorMessage(0, '')).toMatch(/conexión/)
    expect(albumErrorMessage(422, 'Ya subiste tus 2 fotos.')).toBe('Ya subiste tus 2 fotos.')
  })

  it('espacio usado y aviso al 80 %', () => {
    expect(formatBytes(512 * 1024)).toBe('512 KB')
    expect(formatBytes(42 * 1024 * 1024)).toBe('42 MB')
    expect(usageLabel(42 * 1024 * 1024, 300 * 1024 * 1024)).toBe('42 MB de 300 MB')
    expect(usageWarning(79)).toBe('')
    expect(usageWarning(80)).toMatch(/80|va en/)
    expect(usageWarning(100)).toMatch(/lleno/)
  })
})
