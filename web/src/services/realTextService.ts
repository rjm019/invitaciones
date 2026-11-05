/**
 * El texto de verdad de un bloque de la invitación, una sola vez. Los efectos de letras
 * (FxText, TypewriterText) dejan el texto completo para el lector de pantalla y, además,
 * una copia partida en letras (`aria-hidden`) para animarla: leer `textContent` o
 * `innerText` de todo el bloque lo duplica («ALEXAALEXA»). Aquí se descartan las copias
 * ocultas para lectores y los destellos, y queda solo el texto real.
 */
export function realText(el: Element, options: { lines?: boolean } = {}): string {
  const clone = el.cloneNode(true) as Element
  clone.querySelectorAll('[aria-hidden="true"]').forEach((n) => n.remove())
  clone.querySelectorAll('br').forEach((br) => br.replaceWith(options.lines ? '\n' : ' '))
  const raw = clone.textContent ?? ''
  if (options.lines) {
    return raw
      .split('\n')
      .map((line) => line.replace(/\s+/g, ' ').trim())
      .join('\n')
      .trim()
  }
  return raw.replace(/\s+/g, ' ').trim()
}
