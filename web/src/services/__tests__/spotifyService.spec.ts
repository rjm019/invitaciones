import { describe, expect, it } from 'vitest'
import { spotifyEmbed, spotifyHeight } from '../spotifyService'

describe('spotifyService', () => {
  it('convierte el enlace de "Compartir" en el reproductor oscuro de Spotify', () => {
    expect(
      spotifyEmbed('https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M?si=abc123'),
    ).toEqual({
      embedUrl:
        'https://open.spotify.com/embed/playlist/37i9dQZF1DXcBWIGoYBM5M?utm_source=generator&theme=0&locale=es-419',
      openUrl: 'https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M',
      uri: 'spotify:playlist:37i9dQZF1DXcBWIGoYBM5M',
      kind: 'playlist',
    })
  })

  it('acepta enlaces con idioma (/intl-es/), de álbum o canción, y el URI de la app', () => {
    expect(spotifyEmbed('https://open.spotify.com/intl-es/playlist/AbC123')?.openUrl).toBe(
      'https://open.spotify.com/playlist/AbC123',
    )
    expect(spotifyEmbed('https://open.spotify.com/intl-pt-br/album/Xyz9')?.kind).toBe('album')
    expect(spotifyEmbed('https://open.spotify.com/embed/track/T1')?.kind).toBe('track')
    expect(spotifyEmbed('spotify:playlist:AbC123')?.openUrl).toBe(
      'https://open.spotify.com/playlist/AbC123',
    )
  })

  it('cualquier otra cosa no muestra reproductor', () => {
    expect(spotifyEmbed('')).toBeNull()
    expect(spotifyEmbed(null)).toBeNull()
    expect(spotifyEmbed('https://youtube.com/watch?v=1')).toBeNull()
    expect(spotifyEmbed('https://open.spotify.com/user/alguien')).toBeNull()
  })

  it('completa (por defecto) deja ver unas 8 canciones; lista, 3; compacta, solo el botón', () => {
    expect(spotifyHeight()).toBe(560)
    expect(spotifyHeight('completa')).toBe(560)
    expect(spotifyHeight('lista')).toBe(352)
    expect(spotifyHeight('compacta')).toBe(152)
  })
})
