import { describe, expect, it } from 'vitest'
import {
  MAX_AUDIO_START,
  audioStartError,
  clock,
  maxAudioStart,
  readAudioDuration,
  type DurationAudio,
} from '../audioDurationService'

class FakeAudio extends EventTarget implements DurationAudio {
  src = ''
  preload = ''
  duration = Number.NaN
  removed = false
  removeAttribute() {
    this.removed = true
  }
  load() {}
}

describe('audioDurationService', () => {
  it('lee la duración de los metadatos y libera el elemento', async () => {
    const fake = new FakeAudio()
    const result = readAudioDuration('/m.mp3', () => fake)
    expect(fake.src).toBe('/m.mp3')
    expect(fake.preload).toBe('metadata')
    fake.duration = 187.4
    fake.dispatchEvent(new Event('loadedmetadata'))
    expect(await result).toBe(187.4)
    expect(fake.removed).toBe(true)
  })

  it('devuelve null si el archivo falla, no tiene duración o tarda demasiado', async () => {
    const bad = new FakeAudio()
    const failed = readAudioDuration('/x.mp3', () => bad)
    bad.dispatchEvent(new Event('error'))
    expect(await failed).toBeNull()

    const inf = new FakeAudio()
    const stream = readAudioDuration('/x.mp3', () => inf)
    inf.duration = Number.POSITIVE_INFINITY
    inf.dispatchEvent(new Event('loadedmetadata'))
    expect(await stream).toBeNull()

    expect(await readAudioDuration('/x.mp3', () => new FakeAudio(), 5)).toBeNull()
  })

  it('el último inicio válido es el segundo entero anterior al final', () => {
    expect(maxAudioStart(187.4)).toBe(186)
    expect(maxAudioStart(10)).toBe(9)
    expect(maxAudioStart(0.5)).toBe(0)
    expect(maxAudioStart(null)).toBe(MAX_AUDIO_START)
    expect(maxAudioStart(99999)).toBe(MAX_AUDIO_START)
  })

  it('da mensajes en español para inicios inválidos', () => {
    expect(audioStartError('', 100)).toBeNull()
    expect(audioStartError('45', 100)).toBeNull()
    expect(audioStartError('99', 100)).toBeNull()
    expect(audioStartError('100', 100)).toBe('La canción dura 1:40; el inicio debe ser menor.')
    expect(audioStartError('-3', 100)).toMatch(/entero/)
    expect(audioStartError('2.5', null)).toMatch(/entero/)
    expect(audioStartError('abc', null)).toMatch(/entero/)
    expect(audioStartError('40000', null)).toMatch(/36000/)
    expect(audioStartError('500', null)).toBeNull() // sin duración conocida solo se revisa el rango
    expect(clock(75.4)).toBe('1:15')
  })
})
