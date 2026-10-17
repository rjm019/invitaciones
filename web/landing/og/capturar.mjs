/**
 * Arma las imágenes para compartir de la landing (web/public/og/*.png) con Chromium.
 *
 * Desde la raíz del repo, con la imagen capturas-landing:local (Chromium + puppeteer-core):
 *
 *   T=$(mktemp -d) && mkdir -p $T/fuentes $T/out
 *   for f in cormorant-garamond/files/cormorant-garamond-latin-{400-normal,500-normal,400-italic}.woff2 \
 *            pinyon-script/files/pinyon-script-latin-400-normal.woff2; do
 *     docker compose cp web:/app/node_modules/@fontsource/$f $T/fuentes/; done
 *   cp web/landing/og/capturar.mjs $T/ && \
 *     sed -e '/@iconos/{r web/landing/partials/icons.html' -e 'd' -e '}' web/landing/og/plantilla.html > $T/og.html
 *   docker run --rm -v $T:/og --entrypoint sh capturas-landing:local \
 *     -c 'cp /og/capturar.mjs /work/ && cd /work && node capturar.mjs'
 *   cp $T/out/*.png web/public/og/
 */
import puppeteer from 'puppeteer-core'

const browser = await puppeteer.launch({
  executablePath: '/usr/bin/chromium-browser',
  args: ['--no-sandbox', '--allow-file-access-from-files'],
})
const page = await browser.newPage()
await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 })
for (const v of ['inicio', 'boda', 'xv', 'graduacion']) {
  await page.goto(`file:///og/og.html?v=${v}`, { waitUntil: 'load' })
  await page.evaluate(() => document.fonts.ready)
  await page.screenshot({ path: `/og/out/${v}.png` })
}
await browser.close()
