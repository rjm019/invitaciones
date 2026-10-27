import { describe, expect, it } from 'vitest'
import { aspectRatio, parseSocialUrl, playerSrc } from '../socialEmbedService'

// Los mismos casos que api/tests/Unit/Media/SocialEmbedTest.php.
const valid: [string, string, string, string, string][] = [
  [
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    'youtube',
    'video',
    'dQw4w9WgXcQ',
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  ],
  [
    'https://youtube.com/watch?v=dQw4w9WgXcQ&list=PL1&t=3s',
    'youtube',
    'video',
    'dQw4w9WgXcQ',
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  ],
  [
    'https://youtu.be/dQw4w9WgXcQ?si=abc',
    'youtube',
    'video',
    'dQw4w9WgXcQ',
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  ],
  [
    'https://www.youtube.com/shorts/abcdefghijk',
    'youtube',
    'short',
    'abcdefghijk',
    'https://www.youtube.com/shorts/abcdefghijk',
  ],
  [
    'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
    'youtube',
    'video',
    'dQw4w9WgXcQ',
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  ],
  [
    'https://www.instagram.com/reel/C8abcDEF123/?igsh=xyz',
    'instagram',
    'reel',
    'C8abcDEF123',
    'https://www.instagram.com/reel/C8abcDEF123/',
  ],
  [
    'https://instagram.com/jiro.invitaciones/p/Cabc_12-x/',
    'instagram',
    'post',
    'Cabc_12-x',
    'https://www.instagram.com/p/Cabc_12-x/',
  ],
  [
    'https://www.instagram.com/reels/C8abcDEF123',
    'instagram',
    'reel',
    'C8abcDEF123',
    'https://www.instagram.com/reel/C8abcDEF123/',
  ],
  [
    'https://www.facebook.com/watch/?v=1234567890123',
    'facebook',
    'video',
    '1234567890123',
    'https://www.facebook.com/watch/?v=1234567890123',
  ],
  [
    'https://m.facebook.com/reel/1234567890123',
    'facebook',
    'video',
    '1234567890123',
    'https://www.facebook.com/reel/1234567890123',
  ],
  [
    'https://www.facebook.com/jiro/videos/1234567890123/',
    'facebook',
    'video',
    '1234567890123',
    'https://www.facebook.com/jiro/videos/1234567890123',
  ],
  [
    'https://www.facebook.com/jiro/posts/pfbid02abcDEF',
    'facebook',
    'post',
    'pfbid02abcDEF',
    'https://www.facebook.com/jiro/posts/pfbid02abcDEF',
  ],
]

const invalid = [
  '',
  'javascript:alert(1)',
  'data:text/html,<script>1</script>',
  'http://www.youtube.com/watch?v=dQw4w9WgXcQ',
  'www.youtube.com/watch?v=dQw4w9WgXcQ',
  'https://vimeo.com/123456789',
  'https://youtube.com.evil.com/watch?v=dQw4w9WgXcQ',
  'https://evilyoutube.com/watch?v=dQw4w9WgXcQ',
  'https://youtube.com@evil.com/watch?v=dQw4w9WgXcQ',
  'https://evil.com@www.youtube.com/watch?v=dQw4w9WgXcQ',
  'https://www.youtube.com:8443/watch?v=dQw4w9WgXcQ',
  'https://www.youtube.com:443/watch?v=dQw4w9WgXcQ',
  'https://youtu.be/abc',
  'https://www.youtube.com/watch?v=dQw4w9WgXc"',
  'https://www.youtube.com/@jiro',
  'https://www.instagram.com/jiro.invitaciones/',
  'https://www.facebook.com/jiro',
  'https://www.facebook.com/jiro/videos/abc',
  'https://youtu.be/dQw4w9WgXcQ <script>',
  'https://youtube.com\\@evil.com/watch?v=dQw4w9WgXcQ',
]

describe('parseSocialUrl', () => {
  it.each(valid)('acepta %s', (input, network, kind, id, url) => {
    const link = parseSocialUrl(input)
    expect(link).toMatchObject({ network, kind, id, url })
  })

  it.each(invalid)('rechaza %j', (input) => {
    expect(parseSocialUrl(input)).toBeNull()
  })

  it('arma el embed desde las partes validadas, no desde lo que se escribió', () => {
    expect(parseSocialUrl('https://youtu.be/dQw4w9WgXcQ?x=1')?.embed).toBe(
      'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
    )
    expect(parseSocialUrl('https://www.instagram.com/reel/C8abcDEF123/')?.embed).toBeNull()
    const fb = parseSocialUrl('https://www.facebook.com/watch/?v=1234567890123&extra=1')
    expect(fb?.embed).toBe(
      `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent('https://www.facebook.com/watch/?v=1234567890123')}&show_text=false&width=560`,
    )
  })

  it('con una red pedida, solo acepta esa', () => {
    expect(parseSocialUrl('https://youtu.be/dQw4w9WgXcQ', 'youtube')).not.toBeNull()
    expect(parseSocialUrl('https://youtu.be/dQw4w9WgXcQ', 'instagram')).toBeNull()
  })
})

describe('playerSrc y aspectRatio', () => {
  it('YouTube sin cookies y con autoplay solo porque ya hubo un toque', () => {
    const link = parseSocialUrl('https://youtu.be/dQw4w9WgXcQ')!
    expect(playerSrc(link)).toBe(
      'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1&rel=0&playsinline=1',
    )
  })
  it('Instagram no tiene iframe: usa su script', () => {
    expect(playerSrc(parseSocialUrl('https://www.instagram.com/reel/C8abcDEF123/')!)).toBeNull()
  })
  it('la proporción sale del formato o de la red', () => {
    const yt = parseSocialUrl('https://youtu.be/dQw4w9WgXcQ')
    expect(aspectRatio(yt, 'horizontal')).toBe('16 / 9')
    expect(aspectRatio(yt, 'vertical')).toBe('9 / 16')
    expect(aspectRatio(parseSocialUrl('https://www.instagram.com/reel/C8abcDEF123/'))).toBe(
      '9 / 16',
    )
    expect(aspectRatio(parseSocialUrl('https://www.instagram.com/p/C8abcDEF123/'))).toBe('4 / 5')
    expect(aspectRatio(null)).toBe('16 / 9')
  })
})
