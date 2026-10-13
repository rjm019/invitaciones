/**
 * extraer-diseno-canva.js
 * ---------------------------------------------------------------
 * Pega este script en la consola de DevTools (F12 → Console) estando
 * en un sitio publicado de Canva (*.my.canva.site/...) o cualquier
 * landing. Genera un JSON con:
 *   - textos (contenido, posición, fuente, tamaño, color, interletrado)
 *   - imágenes (URL del asset, tamaño natural y mostrado, posición)
 *   - links, iframes (embeds), audio/video
 *   - paleta de colores de texto y fondo (frecuencia)
 *   - alto total y contenedor de scroll
 * y lo descarga como `diseno-<slug>.json`.
 *
 * Úsalo SOLO en diseños propios o con autorización del dueño.
 * No extrae ni descarga archivos: solo lista sus URLs.
 */
(() => {
  // 1) Contenedor de scroll (Canva hace scroll dentro de un div, no del body)
  const scrollers = [...document.querySelectorAll('*')].filter((e) => {
    const cs = getComputedStyle(e);
    return /(auto|scroll)/.test(cs.overflowY) && e.scrollHeight > e.clientHeight + 50;
  });
  const sc = scrollers.sort((a, b) => b.scrollHeight - a.scrollHeight)[0] || document.scrollingElement;
  const st = sc.scrollTop;
  const rect = (el) => {
    const r = el.getBoundingClientRect();
    return { y: Math.round(r.top + st), x: Math.round(r.left), w: Math.round(r.width), h: Math.round(r.height) };
  };

  // 2) Textos
  const texts = [];
  document.querySelectorAll('body *').forEach((el) => {
    const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 1);
    if (!own) return;
    const cs = getComputedStyle(el);
    if (cs.color === 'rgba(0, 0, 0, 0)' || cs.visibility === 'hidden') return;
    const r = rect(el);
    if (r.w === 0) return;
    texts.push({
      text: el.innerText.trim().replace(/\s*\n\s*/g, ' / '),
      ...r,
      fontFamily: cs.fontFamily.split(',')[0].replace(/"/g, ''),
      fontSize: Math.round(parseFloat(cs.fontSize)),
      fontWeight: cs.fontWeight,
      fontStyle: cs.fontStyle,
      letterSpacing: cs.letterSpacing,
      lineHeight: cs.lineHeight,
      color: cs.color,
      textTransform: cs.textTransform,
      textAlign: cs.textAlign,
    });
  });
  texts.sort((a, b) => a.y - b.y);

  // 3) Imágenes
  const images = [...document.querySelectorAll('img')].map((img) => ({
    url: (img.currentSrc || img.src).startsWith('blob:') ? '(blob: generado en el navegador)' : img.currentSrc || img.src,
    file: (img.currentSrc || img.src).split('/').pop().split('?')[0],
    natural: `${img.naturalWidth}x${img.naturalHeight}`,
    ...rect(img),
    opacity: getComputedStyle(img).opacity,
  })).sort((a, b) => a.y - b.y);

  // 4) Links, iframes, media
  const links = [...document.querySelectorAll('a[href]')].map((a) => ({ text: a.innerText.trim(), href: a.href, ...rect(a) }));
  const iframes = [...document.querySelectorAll('iframe')].map((f) => {
    let host = null, path = null, embedded = null;
    try {
      const u = new URL(f.src); host = u.host; path = u.pathname;
      const inner = u.searchParams.get('url'); if (inner) { const iu = new URL(inner); embedded = iu.host + iu.pathname; }
    } catch (e) { /* noop */ }
    return { host, path, embedded, ...rect(f) };
  });
  const media = [...document.querySelectorAll('audio, video')].map((m) => ({ tag: m.tagName, src: (m.currentSrc || m.src || '').split('?')[0], poster: m.poster || null, ...rect(m) }));

  // 5) Paleta
  const count = (obj, k) => (obj[k] = (obj[k] || 0) + 1);
  const textColors = {}; texts.forEach((t) => count(textColors, t.color));
  const bgColors = {};
  document.querySelectorAll('body *').forEach((el) => {
    const c = getComputedStyle(el).backgroundColor;
    if (c && c !== 'rgba(0, 0, 0, 0)') count(bgColors, c);
  });
  const fonts = {}; texts.forEach((t) => count(fonts, t.fontFamily));

  // 6) Animaciones activas (Web Animations API)
  const animations = document.getAnimations().map((a) => ({
    name: a.animationName || a.id || a.constructor.name,
    duration: a.effect?.getTiming?.().duration,
  }));

  const out = {
    url: location.href,
    title: document.title,
    capturedAt: new Date().toISOString(),
    viewport: { w: innerWidth, h: innerHeight },
    scrollContainer: { tag: sc.tagName, className: String(sc.className).slice(0, 60), scrollHeight: sc.scrollHeight },
    ogImage: document.querySelector('meta[property="og:image"]')?.content || null,
    fonts, textColors, bgColors,
    texts, images, links, iframes, media, animations,
  };

  const slug = location.pathname.split('/').filter(Boolean).pop() || 'sitio';
  const blob = new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `diseno-${slug}.json`;
  a.click();
  console.log(`✔ ${texts.length} textos, ${images.length} imágenes, ${links.length} links, ${iframes.length} iframes → diseno-${slug}.json`);
  console.log('Siguiente paso: haz scroll del contenedor y toma capturas cada', innerHeight, 'px →', 'sc.scrollTo(0, N)');
  window.__sc = sc; // para hacer: __sc.scrollTo(0, 600)
  return out;
})();
