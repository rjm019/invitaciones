import { describe, expect, it } from 'vitest'
import {
  ENGRAVED_ICONS,
  engravedIcon,
  momentDrawing,
  type EngravedIconKey,
} from '../engravedIconService'

describe('engravedIcon', () => {
  it('elige el dibujo por el ícono del editor', () => {
    expect(engravedIcon('champagne-glasses')).toBe('copa')
    expect(engravedIcon('ring')).toBe('anillos')
    expect(engravedIcon('utensils')).toBe('plato')
    expect(engravedIcon('cake-candles')).toBe('pastel')
    expect(engravedIcon('music')).toBe('musica')
    expect(engravedIcon('church')).toBe('iglesia')
    expect(engravedIcon('camera')).toBe('camara')
  })

  it('el ícono gana sobre las palabras de la actividad', () => {
    expect(engravedIcon('cake-candles', 'Cena')).toBe('pastel')
  })

  it('sin ícono, lo decide la actividad (sin acentos ni mayúsculas)', () => {
    expect(engravedIcon(undefined, 'Brindis')).toBe('copa')
    expect(engravedIcon('', 'Recepción')).toBe('copa')
    expect(engravedIcon(null, 'CENA')).toBe('plato')
    expect(engravedIcon(undefined, 'Pastel')).toBe('pastel')
    expect(engravedIcon(undefined, 'Vals y baile')).toBe('musica')
    expect(engravedIcon(undefined, 'Ceremonia religiosa')).toBe('iglesia')
    expect(engravedIcon(undefined, 'Ceremonia civil')).toBe('anillos')
    expect(engravedIcon(undefined, 'Sesión de fotos')).toBe('camara')
  })

  it('lo desconocido es el corazón', () => {
    expect(engravedIcon('no-existe', 'Algo raro')).toBe('corazon')
    expect(engravedIcon(undefined)).toBe('corazon')
  })

  it('cada clave que se puede elegir tiene su dibujo de línea', () => {
    const keys = new Set<EngravedIconKey>([
      engravedIcon('glass-cheers'),
      engravedIcon('rings'),
      engravedIcon('bowl-food'),
      engravedIcon('birthday-cake'),
      engravedIcon('guitar'),
      engravedIcon('place-of-worship'),
      engravedIcon('camera-retro'),
      engravedIcon('heart'),
      engravedIcon('leaf'),
    ])
    expect(keys.size).toBe(9)
    for (const [key, drawing] of Object.entries(ENGRAVED_ICONS)) {
      expect(drawing, key).toMatch(/<(path|circle|ellipse|g)\b/)
      // Constantes del código: ningún script ni manejador de eventos.
      expect(drawing, key).not.toMatch(/<script|on\w+=/i)
    }
  })
})

describe('momentDrawing', () => {
  it('agrega la pareja, la luna y el auto sin cambiar el grabado', () => {
    expect(momentDrawing(undefined, 'Primer baile')).toBe('pareja')
    expect(momentDrawing(undefined, 'Tornaboda')).toBe('luna')
    expect(momentDrawing(undefined, 'Traslado a la hacienda')).toBe('auto')
    // El grabado de siempre sigue igual con las mismas palabras.
    expect(engravedIcon(undefined, 'Primer baile')).toBe('musica')
  })

  it('el ícono elegido gana; si no, usa las palabras del grabado', () => {
    expect(momentDrawing('music', 'Primer baile')).toBe('musica')
    expect(momentDrawing('car', 'Cena')).toBe('auto')
    expect(momentDrawing(undefined, 'Cena')).toBe('plato')
    expect(momentDrawing(undefined, 'Ceremonia religiosa')).toBe('iglesia')
    expect(momentDrawing(undefined, 'Pastel')).toBe('pastel')
    expect(momentDrawing(undefined, 'Algo raro')).toBe('corazon')
  })
})
