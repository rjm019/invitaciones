<script setup lang="ts">
import { computed, useId } from 'vue'

/**
 * Gansito blanco de pie, en acuarela: cuerpo ovalado, cuello largo en S, pico y patas naranja
 * suave, ojito y mejilla rosa; gorro de fiesta a rayas con pompón y moño al cuello. Con
 * `walking` anda: el cuerpo se balancea, las patas alternan, la cabeza cabecea y el moño rebota.
 * Con `balloons` (0 a 3) sostiene globos con hilo con el ala; cada uno flota y se mece a su
 * ritmo. `flip` lo hace mirar al otro lado. Cada forma lleva dos lavados, borde de pigmento,
 * luces en blanco y sombras frías; el grano y el borde irregular vienen de un filtro estático
 * (se anima el transform de los grupos que lo contienen, nunca el filtro). Solo transform y
 * opacity; con "menos movimiento" queda quieto. Color: `--bow-color` (gorro, moño, globos y
 * mejilla; respaldo `--color-primary`, con `--bow-color-dark` y `--bow-color-soft`),
 * `--color-oro` y `--color-paper`. El pico y las patas son naranja suave fijo (del animal).
 * Mide el ancho de su contenedor o `size` (CSS). Sirve en cualquier tema.
 *
 * `pose`: `standing` (de pie, por defecto) o `sitting`: sentado de perfil mirando a la
 * izquierda (`flip` lo voltea), con las patas estiradas al frente, un moño grande de colas largas
 * al cuello y los globos detrás del ala. Sentado mueve la cabeza, parpadea de vez en cuando
 * (opacity) y mece las colas del moño y los globos. Las sombras son un lavado beige cálido.
 */
const props = withDefaults(
  defineProps<{
    walking?: boolean
    balloons?: number
    flip?: boolean
    size?: string
    pose?: 'standing' | 'sitting'
  }>(),
  { walking: false, balloons: 0, flip: false, size: undefined, pose: 'standing' },
)

const fid = `pg-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
const clipId = `${fid}-hat`

// Globos: centro, giro y ritmo propios; los hilos salen todos del ala (100,238).
const HOLD = { x: 100, y: 240 }
const BALLOONS = [
  { cx: 44, cy: 124, mix: 0, dur: 3.4, delay: 0, tilt: 3.2 },
  { cx: 92, cy: 80, mix: 1, dur: 4.1, delay: -1.4, tilt: 2.6 },
  { cx: 22, cy: 58, mix: 2, dur: 3.8, delay: -2.5, tilt: 3.6 },
]
const shown = computed(() => BALLOONS.slice(0, Math.max(0, Math.min(3, Math.round(props.balloons)))))
const stringD = (b: { cx: number; cy: number }) => {
  const by = b.cy + 31
  return `M${b.cx} ${by}C${b.cx + 6} ${by + 40} ${HOLD.x - 12} ${HOLD.y - 46} ${HOLD.x} ${HOLD.y}`
}
const BALLOON =
  'M0 -30C16 -30 26 -16 25 -2C24 16 10 28 0 30C-10 28 -24 16 -25 -2C-26 -16 -16 -30 0 -30Z'
// Sentado: tres globos detrás del ala; los hilos salen del lomo (196,168).
const SIT_HOLD = { x: 196, y: 168 }
const SIT_BALLOONS = [
  { cx: 208, cy: 58, mix: 0, dur: 3.4, delay: 0, tilt: 3.2 },
  { cx: 252, cy: 100, mix: 1, dur: 4.1, delay: -1.4, tilt: 2.6 },
  { cx: 160, cy: 30, mix: 2, dur: 3.8, delay: -2.5, tilt: 3.6 },
]
const sitShown = computed(() => SIT_BALLOONS.slice(0, Math.max(0, Math.min(3, Math.round(props.balloons)))))
const sitStringD = (b: { cx: number; cy: number }) => {
  const by = b.cy + 31
  return `M${b.cx} ${by}C${b.cx - 4} ${by + 40} ${SIT_HOLD.x + 8} ${SIT_HOLD.y - 50} ${SIT_HOLD.x} ${SIT_HOLD.y}`
}
const flapStyle = (b: { dur: number; delay: number; tilt: number }) => ({
  '--dur': `${b.dur}s`,
  '--delay': `${b.delay}s`,
  '--tilt': `${b.tilt}deg`,
})
</script>

<template>
  <div
    class="pg"
    :class="{ 'is-walking': walking, 'pg--flip': flip, 'pg--sit': pose === 'sitting' }"
    :style="size ? { width: size } : undefined"
    aria-hidden="true"
  >
    <svg v-if="pose !== 'sitting'" viewBox="0 -18 300 390" focusable="false">
      <defs>
        <filter :id="fid" x="-6%" y="-6%" width="112%" height="112%">
          <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="11" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="2.6" xChannelSelector="R" yChannelSelector="G" result="d" />
          <feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="2" seed="5" result="g" />
          <feColorMatrix in="g" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -0.6 1.08" result="ga" />
          <feComposite in="d" in2="ga" operator="in" />
        </filter>
        <clipPath :id="clipId">
          <path d="M187 66L214 8L231 60C219 66 201 68 187 66Z" />
        </clipPath>
      </defs>

      <g class="pg__art">
        <ellipse class="pg__ground" cx="150" cy="352" rx="96" ry="5" />

        <!-- globos con su hilo: salen del ala y flotan cada uno a su ritmo -->
        <g v-for="(b, i) in shown" :key="i" class="pg__balloon" :class="`pg__balloon--${i}`" :style="flapStyle(b)">
          <g :filter="`url(#${fid})`">
            <path class="string" :d="stringD(b)" />
            <g :transform="`translate(${b.cx} ${b.cy})`">
              <path class="balloon" :class="`balloon--${b.mix}`" :d="BALLOON" />
              <path class="balloon-2" :class="`balloon--${b.mix}`" transform="translate(2.4 2)" :d="BALLOON" />
              <path class="shade" d="M25 -2C24 16 10 28 0 30C-10 28 -24 16 -25 -2C-14 12 12 14 25 -2Z" />
              <path class="edge" :d="BALLOON" />
              <path class="gloss" d="M-15 -12C-14 -20 -8 -25 -2 -25" />
              <path class="balloon-knot" d="M-4 33L0 29L4 33Z" />
            </g>
          </g>
        </g>

        <!-- patas: alternan al andar -->
        <g class="pg__leg pg__leg--a">
          <g :filter="`url(#${fid})`">
            <path class="beak-line leg-line" d="M128 292C128 312 126 326 122 338" />
            <path class="foot" d="M104 346C112 336 128 336 138 342C142 347 134 350 122 350C112 350 104 349 104 346Z" />
            <path class="foot-line" d="M112 345L120 343M122 347L128 343" />
          </g>
        </g>
        <g class="pg__leg pg__leg--b">
          <g :filter="`url(#${fid})`">
            <path class="beak-line leg-line" d="M172 292C172 312 172 326 170 338" />
            <path class="foot" d="M150 346C158 336 176 336 186 342C190 347 182 350 170 350C158 350 150 349 150 346Z" />
            <path class="foot-line" d="M158 345L166 343M168 347L174 343" />
          </g>
        </g>

        <!-- el cuerpo se balancea con la cabeza y el moño encima -->
        <g class="pg__torso">
          <g :filter="`url(#${fid})`">
            <!-- cuerpo: cola levantada, pecho al frente -->
            <path class="white" d="M64 234C48 230 36 218 30 198C38 196 48 200 56 205C64 208 70 211 78 215C90 190 130 184 168 192C212 200 234 232 216 266C198 298 124 304 90 282C72 270 64 252 64 232Z" />
            <path class="white-2" transform="translate(2.5 2)" d="M64 234C48 230 36 218 30 198C38 196 48 200 56 205C64 208 70 211 78 215C90 190 130 184 168 192C212 200 234 232 216 266C198 298 124 304 90 282C72 270 64 252 64 232Z" />
            <path class="shade" d="M90 282C124 304 198 298 216 266C224 246 218 228 204 214C214 244 196 282 150 288C122 292 100 288 90 282Z" />
            <path class="shade shade--tail" d="M30 204C52 200 66 206 76 214C60 214 44 210 30 204Z" />
            <path class="edge" d="M64 234C48 230 36 218 30 198C38 196 48 200 56 205C64 208 70 211 78 215C90 190 130 184 168 192C212 200 234 232 216 266C198 298 124 304 90 282C72 270 64 252 64 232Z" />
            <path class="gloss" d="M92 206C112 196 142 194 164 200" />
            <!-- plumitas del pecho -->
            <path class="feather" d="M190 232C196 234 200 238 200 244M182 250C188 252 192 256 192 262M200 214C204 216 208 220 208 226" />
          </g>

          <!-- ala: sostiene los hilos -->
          <g class="pg__wing" :filter="`url(#${fid})`">
            <path class="white" d="M98 238C116 214 168 216 196 240C188 272 142 284 106 264C92 256 92 246 98 238Z" />
            <path class="wing-2" transform="translate(2 2.5)" d="M98 238C116 214 168 216 196 240C188 272 142 284 106 264C92 256 92 246 98 238Z" />
            <path class="shade" d="M106 264C142 284 188 272 196 240C192 262 150 278 112 262Z" />
            <path class="edge" d="M98 238C116 214 168 216 196 240C188 272 142 284 106 264C92 256 92 246 98 238Z" />
            <path class="feather" d="M122 232C138 232 158 240 170 254M112 244C128 246 148 256 160 268M134 224C150 224 172 232 184 244" />
          </g>

          <!-- cuello en S, corto y grueso -->
          <g transform="translate(0 44.4) scale(1 0.8)" :filter="`url(#${fid})`">
            <path class="white" d="M168 214C176 190 160 170 164 140C168 112 176 100 190 88L222 92C214 110 192 124 192 146C194 170 210 196 222 222Z" />
            <path class="white-2" transform="translate(2.5 1.5)" d="M168 214C176 190 160 170 164 140C168 112 176 100 190 88L222 92C214 110 192 124 192 146C194 170 210 196 222 222Z" />
            <path class="shade" d="M192 146C194 170 210 196 222 222L212 222C200 196 184 170 184 146C184 124 200 112 212 100C202 114 192 128 192 146Z" />
            <path class="edge" d="M168 214C176 190 160 170 164 140C168 112 176 100 190 88M222 92C214 110 192 124 192 146C194 170 210 196 222 222" />
            <path class="gloss gloss--neck" d="M174 200C170 180 168 160 172 138C174 124 180 112 188 102" />
          </g>

          <!-- moño al cuello -->
          <g class="pg__bow-wrap" transform="translate(202 198)">
            <g class="pg__bow" :filter="`url(#${fid})`">
              <path class="bow-tail" d="M-2 4C-8 14 -12 20 -18 27L-8 24L-6 32C-2 22 1 14 2 5Z" />
              <path class="bow-tail" d="M2 4C8 14 12 20 18 26L8 23L6 31C2 21 -1 14 -2 5Z" />
              <path class="bow-loop" d="M0 0C-8 -13 -30 -16 -32 -2C-34 12 -10 11 0 2Z" />
              <path class="bow-loop" d="M0 0C8 -13 30 -16 32 -2C34 12 10 11 0 2Z" />
              <path class="gloss gloss--bow" d="M-8 -4C-14 -9 -22 -9 -27 -5" />
              <ellipse class="bow-knot" cx="0" cy="0.5" rx="6" ry="5.4" />
            </g>
          </g>

          <!-- cabeza, pico, ojo y gorro: cabecea al andar -->
          <g class="pg__head">
            <g transform="translate(0 26) translate(206 92) scale(1.2) translate(-206 -92)">
            <g :filter="`url(#${fid})`">
              <path class="white" d="M186 82C186 62 206 54 224 62C234 67 234 86 226 92C214 100 188 100 186 82Z" />
              <path class="white-2" transform="translate(2 1.5)" d="M186 82C186 62 206 54 224 62C234 67 234 86 226 92C214 100 188 100 186 82Z" />
              <path class="shade" d="M226 92C214 100 188 100 186 82C196 94 214 94 232 80C232 86 230 90 226 92Z" />
              <path class="edge" d="M186 82C186 62 206 54 224 62C234 67 234 86 226 92C214 100 188 100 186 82Z" />
              <!-- pico -->
              <path class="beak" d="M229 70C244 67 257 73 259 80C254 87 239 89 229 87Z" />
              <path class="beak-2" d="M229 80C240 81 251 81 258 80C254 87 239 89 229 87Z" />
              <path class="beak-line" d="M230 79.5C240 81 251 81 257 79.5" />
              <circle class="nostril" cx="243" cy="74.5" r="0.9" />
              <!-- ojo y mejilla -->
              <ellipse class="cheek" cx="214" cy="87" rx="8" ry="5" />
              <circle class="eye" cx="217" cy="72" r="3" />
              <circle class="eye-glint" cx="218" cy="70.8" r="1" />
              <path class="lash" d="M213 68.6C214 67.4 215 67 216.4 67" />
            </g>
            <!-- gorro de fiesta a rayas con pompón -->
            <g :filter="`url(#${fid})`">
              <path class="hat-base" d="M187 66L214 8L231 60C219 66 201 68 187 66Z" />
              <g :clip-path="`url(#${clipId})`">
                <path class="stripe" d="M214 8L187 74L195.8 72.8Z" />
                <path class="stripe" d="M214 8L204.6 71.6L213.4 70.4Z" />
                <path class="stripe" d="M214 8L222.2 69.2L231 68Z" />
                <path class="stripe stripe--soft" d="M214 8L195.8 72.8L204.6 71.6Z" />
                <path class="stripe stripe--soft" d="M214 8L213.4 70.4L222.2 69.2Z" />
              </g>
              <path class="shade" d="M231 60C219 66 201 68 187 66L190 60C204 62 218 60 226 52Z" />
              <path class="edge hat-edge" d="M187 66L214 8L231 60C219 66 201 68 187 66Z" />
              <path class="hat-trim" d="M187.5 65C201 67.4 219 65.4 230.6 59.6" />
              <g class="pom">
                <circle class="pom-ball" cx="214" cy="8" r="7" />
                <circle class="pom-ball pom-ball--2" cx="209" cy="11" r="4.6" />
                <circle class="pom-ball pom-ball--2" cx="219" cy="11" r="4.6" />
                <circle class="pom-ball" cx="213" cy="2.6" r="4" />
                <circle class="pom-glint" cx="211" cy="5" r="1.6" />
              </g>
            </g>
            </g>
          </g>
        </g>
      </g>
    </svg>
    <svg v-else viewBox="0 -6 300 290" focusable="false">
      <defs>
        <filter :id="fid" x="-6%" y="-6%" width="112%" height="112%">
          <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="11" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="2.6" xChannelSelector="R" yChannelSelector="G" result="d" />
          <feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="2" seed="5" result="g" />
          <feColorMatrix in="g" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -0.6 1.08" result="ga" />
          <feComposite in="d" in2="ga" operator="in" />
        </filter>
        <clipPath :id="clipId">
          <path d="M78 40L110 2L119 46C106 53 90 51 78 40Z" />
        </clipPath>
      </defs>

      <g class="pg__art">
        <ellipse class="pg__ground" cx="150" cy="270" rx="104" ry="5" />

        <!-- globos con hilo, detrás del ala -->
        <g v-for="(b, i) in sitShown" :key="i" class="pg__balloon" :class="`pg__balloon--${i}`" :style="flapStyle(b)">
          <g :filter="`url(#${fid})`">
            <path class="string" :d="sitStringD(b)" />
            <g :transform="`translate(${b.cx} ${b.cy})`">
              <path class="balloon" :class="`balloon--${b.mix}`" :d="BALLOON" />
              <path class="balloon-2" :class="`balloon--${b.mix}`" transform="translate(2.4 2)" :d="BALLOON" />
              <path class="shade" d="M25 -2C24 16 10 28 0 30C-10 28 -24 16 -25 -2C-14 12 12 14 25 -2Z" />
              <path class="edge" :d="BALLOON" />
              <path class="gloss" d="M-15 -12C-14 -20 -8 -25 -2 -25" />
              <path class="balloon-knot" d="M-4 33L0 29L4 33Z" />
            </g>
          </g>
        </g>

        <!-- patas estiradas al frente -->
        <g v-for="n in 2" :key="`leg${n}`" class="pg__leg" :transform="n === 2 ? 'translate(12 15)' : undefined">
          <g :filter="`url(#${fid})`">
            <path class="beak-line leg-line" d="M76 236C66 238 56 240 48 240" />
            <path class="foot" d="M50 234C40 231 26 236 14 247L25 248L20 257L33 253L39 259C44 252 49 245 51 239Z" />
            <path class="foot-line" d="M30 246L40 240M33 252L42 244" />
          </g>
        </g>

        <g :filter="`url(#${fid})`">
          <!-- plumas de la cola, levantadas -->
          <path class="white-2" d="M236 200C246 178 258 160 276 148C277 166 268 186 252 204Z" />
          <path class="edge" d="M236 200C246 178 258 160 276 148C277 166 268 186 252 204Z" />
          <path class="white" d="M220 206C234 190 250 178 268 170C264 186 254 200 238 212Z" />
          <path class="edge" d="M220 206C234 190 250 178 268 170C264 186 254 200 238 212Z" />
          <!-- cuerpo en gota: pecho redondo al frente, cola arriba -->
          <path class="white" d="M98 140C64 156 44 202 66 238C84 262 150 268 200 254C232 245 252 218 266 184C270 174 268 164 262 158C240 172 214 172 200 154C182 130 140 122 118 126C110 128 104 132 98 140Z" />
          <path class="white-2" transform="translate(2.5 2)" d="M98 140C64 156 44 202 66 238C84 262 150 268 200 254C232 245 252 218 266 184C270 174 268 164 262 158C240 172 214 172 200 154C182 130 140 122 118 126C110 128 104 132 98 140Z" />
          <path class="shade" d="M66 238C84 262 150 268 200 254C232 245 252 218 266 184C250 222 222 248 186 252C140 258 90 252 66 238Z" />
          <path class="edge" d="M98 140C64 156 44 202 66 238C84 262 150 268 200 254C232 245 252 218 266 184C270 174 268 164 262 158C240 172 214 172 200 154C182 130 140 122 118 126C110 128 104 132 98 140Z" />
          <path class="gloss" d="M80 176C84 160 94 150 106 144" />
          <path class="feather" d="M70 200C74 206 76 214 74 222M82 188C86 194 88 200 87 206" />
        </g>

        <!-- ala plegada, con tres plumas marcadas hacia la cola -->
        <g :filter="`url(#${fid})`">
          <path class="white" d="M100 178C128 156 188 160 222 196C200 234 140 238 108 218C94 208 92 190 100 178Z" />
          <path class="wing-2" transform="translate(2 2.5)" d="M100 178C128 156 188 160 222 196C200 234 140 238 108 218C94 208 92 190 100 178Z" />
          <path class="white-2" d="M170 190C196 186 220 192 238 202C216 208 190 206 168 200Z" />
          <path class="white-2" d="M158 206C182 206 206 214 222 226C198 228 176 222 154 214Z" />
          <path class="white-2" d="M148 178C174 170 202 174 224 184C200 190 172 190 146 186Z" />
          <path class="edge" d="M170 190C196 186 220 192 238 202C216 208 190 206 168 200ZM158 206C182 206 206 214 222 226C198 228 176 222 154 214ZM148 178C174 170 202 174 224 184C200 190 172 190 146 186Z" />
          <path class="shade" d="M108 218C140 238 200 234 222 196C216 220 170 232 120 222Z" />
          <path class="edge" d="M100 178C128 156 188 160 222 196C200 234 140 238 108 218C94 208 92 190 100 178Z" />
          <path class="feather" d="M122 188C140 184 160 188 176 198M118 204C136 204 156 212 170 222" />
        </g>

        <!-- cuello corto y grueso -->
        <g :filter="`url(#${fid})`">
          <path class="white" d="M84 150C68 126 62 100 70 80L112 78C116 100 118 118 124 134Z" />
          <path class="white-2" transform="translate(2.5 1.5)" d="M84 150C68 126 62 100 70 80L112 78C116 100 118 118 124 134Z" />
          <path class="shade" d="M112 78C116 100 118 118 124 134L112 136C106 118 104 100 100 84Z" />
          <path class="edge" d="M84 150C68 126 62 100 70 80M112 78C116 100 118 118 124 134" />
          <path class="gloss gloss--neck" d="M78 130C72 112 72 96 78 84" />
        </g>

        <!-- moño grande al cuello, con dos colas largas sobre el pecho -->
        <g transform="translate(98 128)">
          <g class="pg__bow" :filter="`url(#${fid})`">
            <g class="pg__bow-tail pg__bow-tail--a">
              <path class="bow-tail" d="M-2 3C6 24 18 46 38 68L27 67L24 80C8 56 -2 32 -7 8Z" />
              <path class="gloss gloss--bow" d="M2 14C8 28 16 42 26 54" />
            </g>
            <g class="pg__bow-tail pg__bow-tail--b">
              <path class="bow-tail" d="M-3 4C-16 22 -26 42 -28 64L-35 55L-41 66C-42 42 -30 20 -10 6Z" />
              <path class="gloss gloss--bow" d="M-6 14C-14 26 -20 38 -24 50" />
            </g>
            <path class="bow-loop" d="M0 0C-10 -17 -38 -22 -42 -4C-45 12 -14 14 0 3Z" />
            <path class="bow-loop" d="M0 0C10 -17 38 -22 42 -4C45 12 14 14 0 3Z" />
            <path class="gloss gloss--bow" d="M-9 -5C-17 -12 -28 -13 -35 -8" />
            <ellipse class="bow-knot" cx="0" cy="1" rx="7" ry="6.4" />
          </g>
        </g>

        <!-- cabeza, pico, ojo y gorro: cabecea y parpadea -->
        <g class="pg__head">
          <g :filter="`url(#${fid})`">
            <path class="white" d="M62 64C62 40 86 30 106 38C124 46 124 74 110 86C94 98 62 90 62 64Z" />
            <path class="white-2" transform="translate(2 1.5)" d="M62 64C62 40 86 30 106 38C124 46 124 74 110 86C94 98 62 90 62 64Z" />
            <path class="shade" d="M110 86C94 98 62 90 62 64C74 82 96 86 116 70C116 78 114 83 110 86Z" />
            <path class="edge" d="M62 64C62 40 86 30 106 38C124 46 124 74 110 86C94 98 62 90 62 64Z" />
            <path class="beak" d="M68 56C54 52 40 56 33 64C42 73 57 76 68 74Z" />
            <path class="beak-2" d="M68 66C57 66 44 66 35 64C42 73 57 76 68 74Z" />
            <path class="beak-line" d="M67 65.6C57 65.8 45 65.4 36 64" />
            <circle class="nostril" cx="52" cy="58.6" r="0.9" />
            <ellipse class="cheek" cx="95" cy="77" rx="8" ry="5" />
            <circle class="eye" cx="86" cy="58" r="3.2" />
            <circle class="eye-glint" cx="85" cy="56.8" r="1.1" />
            <ellipse class="pg__lid" cx="86" cy="58" rx="4.8" ry="4.2" />
            <path class="lash pg__lid" d="M81.4 58.4C84 60.6 88 60.6 90.6 58.4" />
          </g>
          <!-- gorro de fiesta a rayas, ladeado -->
          <g :filter="`url(#${fid})`">
            <path class="hat-base" d="M78 40L110 2L119 46C106 53 90 51 78 40Z" />
            <g :clip-path="`url(#${clipId})`">
              <path class="stripe" d="M110 2L78 40L88 47Z" />
              <path class="stripe" d="M110 2L98 51L108 52Z" />
              <path class="stripe" d="M110 2L119 46L126 44Z" />
              <path class="stripe stripe--soft" d="M110 2L88 47L98 51Z" />
              <path class="stripe stripe--soft" d="M110 2L108 52L119 46Z" />
            </g>
            <path class="shade" d="M119 46C106 53 90 51 78 40L83 37C96 44 110 42 116 34Z" />
            <path class="edge hat-edge" d="M78 40L110 2L119 46C106 53 90 51 78 40Z" />
            <path class="hat-trim" d="M78.6 40.4C90 51 106 52 118.6 45.6" />
            <g class="pom">
              <circle class="pom-ball" cx="110" cy="2" r="7" />
              <circle class="pom-ball pom-ball--2" cx="105" cy="5" r="4.6" />
              <circle class="pom-ball pom-ball--2" cx="115" cy="5" r="4.6" />
              <circle class="pom-ball" cx="109" cy="-3" r="4" />
              <circle class="pom-glint" cx="107" cy="-1" r="1.6" />
            </g>
          </g>
        </g>
      </g>
    </svg>
  </div>
</template>

<style scoped>
.pg {
  --_bow: var(--bow-color, var(--color-primary, #d48a9a));
  --_bow-dark: var(--bow-color-dark, var(--color-primary-strong, #b9647a));
  --_bow-soft: var(--bow-color-soft, var(--color-primary-soft, #f3d3d8));
  --_oro: var(--color-oro, #b8925a);
  --_paper: var(--color-paper, #fdf8f0);
  --_cool: color-mix(in srgb, var(--_bow-dark) 22%, #a38f7a);
  /* El pico y las patas son del animal, no de la paleta. */
  --_beak: #f2b077;
  --_beak-dark: #d98a4c;
  display: block;
  width: 100%;
}
.pg svg {
  display: block;
  width: 100%;
  height: auto;
  overflow: visible;
}
.pg--flip .pg__art {
  transform: scaleX(-1);
  transform-box: view-box;
  transform-origin: 150px 0;
}

.pg__ground {
  fill: var(--_cool);
  opacity: 0.14;
}
/* Pintura: dos lavados, sombra fría, borde de pigmento y luces en blanco. */
.white {
  fill: var(--_paper);
  stroke: none;
}
.white-2 {
  fill: color-mix(in srgb, var(--_paper) 50%, #e6d6bd);
  opacity: 0.6;
}
.wing-2 {
  fill: color-mix(in srgb, var(--_paper) 55%, #eadcc6);
  opacity: 0.6;
}
.shade {
  fill: var(--_cool);
  opacity: 0.34;
}
.shade--tail {
  opacity: 0.18;
}
.edge {
  fill: none;
  stroke: color-mix(in srgb, var(--_cool) 70%, #6b5240);
  stroke-opacity: 0.6;
  stroke-width: 1.2;
  stroke-linejoin: round;
  stroke-linecap: round;
}
.gloss {
  fill: none;
  stroke: #fff;
  stroke-opacity: 0.85;
  stroke-width: 3;
  stroke-linecap: round;
}
.gloss--neck {
  stroke-width: 3.6;
}
.feather {
  fill: none;
  stroke: color-mix(in srgb, var(--_cool) 70%, #6b5240);
  stroke-opacity: 0.38;
  stroke-width: 1.4;
  stroke-linecap: round;
}

/* Pico y patas */
.beak {
  fill: var(--_beak);
  stroke: var(--_beak-dark);
  stroke-opacity: 0.6;
  stroke-width: 1;
  stroke-linejoin: round;
}
.beak-2 {
  fill: var(--_beak-dark);
  opacity: 0.32;
}
.beak-line {
  fill: none;
  stroke: var(--_beak-dark);
  stroke-opacity: 0.75;
  stroke-width: 1.2;
  stroke-linecap: round;
}
.leg-line {
  stroke: var(--_beak);
  stroke-opacity: 1;
  stroke-width: 7;
}
.nostril {
  fill: var(--_beak-dark);
}
.foot {
  fill: var(--_beak);
  stroke: var(--_beak-dark);
  stroke-opacity: 0.65;
  stroke-width: 1;
  stroke-linejoin: round;
}
.foot-line {
  fill: none;
  stroke: var(--_beak-dark);
  stroke-opacity: 0.55;
  stroke-width: 1;
  stroke-linecap: round;
}

/* Cara */
.cheek {
  fill: var(--_bow);
  opacity: 0.5;
}
.eye {
  fill: #4a3a46;
}
.eye-glint {
  fill: #fff;
}
.lash {
  fill: none;
  stroke: #4a3a46;
  stroke-width: 1.2;
  stroke-linecap: round;
}

/* Gorro */
.hat-base {
  fill: var(--_paper);
}
.stripe {
  fill: var(--_bow);
  fill-opacity: 0.72;
}
.stripe--soft {
  fill-opacity: 0.3;
}
.hat-edge {
  stroke: var(--_bow-dark);
  stroke-opacity: 0.45;
}
.hat-trim {
  fill: none;
  stroke: var(--_oro);
  stroke-width: 2.6;
  stroke-linecap: round;
  stroke-dasharray: 0.1 4.6;
}
.pom-ball {
  fill: var(--_bow-soft);
  stroke: var(--_bow-dark);
  stroke-opacity: 0.35;
  stroke-width: 0.8;
}
.pom-ball--2 {
  fill: var(--_paper);
}
.pom-glint {
  fill: #fff;
  fill-opacity: 0.85;
}

/* Moño */
.bow-loop,
.bow-tail {
  fill: var(--_bow);
  fill-opacity: 0.85;
  stroke: var(--_bow-dark);
  stroke-opacity: 0.55;
  stroke-width: 0.9;
  stroke-linejoin: round;
}
.bow-knot {
  fill: var(--_bow-dark);
  fill-opacity: 0.75;
  stroke: var(--_bow-dark);
  stroke-opacity: 0.6;
  stroke-width: 0.8;
}
.gloss--bow {
  stroke-opacity: 0.6;
  stroke-width: 2;
}

/* Globos: tres tonos del listón */
.balloon {
  fill: var(--_bow);
  opacity: 0.6;
}
.balloon-2 {
  fill: var(--_bow);
  opacity: 0.32;
}
.balloon--1 {
  fill: color-mix(in srgb, var(--_bow) 55%, var(--_paper));
}
.balloon--2 {
  fill: color-mix(in srgb, var(--_bow) 62%, var(--_bow-dark));
}
.balloon-knot {
  fill: var(--_bow-dark);
  opacity: 0.6;
}
.string {
  fill: none;
  stroke: color-mix(in srgb, var(--_oro) 55%, #8a7a70);
  stroke-opacity: 0.75;
  stroke-width: 1.1;
  stroke-linecap: round;
}

/* Cada pieza gira o rebota desde su propio apoyo (px del dibujo). */
.pg__torso,
.pg__head,
.pg__bow-wrap,
.pg__balloon,
.pg__bow {
  transform-box: view-box;
}
.pg__leg {
  transform-box: fill-box;
  transform-origin: 50% 0%;
}
.pg__torso {
  transform-origin: 150px 300px;
}
.pg__head {
  transform-origin: 206px 122px;
}
.pg__bow {
  transform-origin: 0 0;
}
.pg__balloon {
  transform-origin: 100px 240px;
}

/* Sentado: la cabeza se mueve y parpadea, las colas del moño y los globos se mecen. */
.pg--sit .pg__balloon {
  transform-origin: 196px 168px;
}
.pg--sit .pg__head {
  transform-origin: 98px 124px;
  animation: pg-look calc(5.4s * var(--motion-scale, 1)) ease-in-out infinite alternate;
}
.pg__lid {
  opacity: 0;
}
.pg--sit .pg__lid {
  fill: var(--_paper);
  animation: pg-blink calc(5.2s * var(--motion-scale, 1)) linear infinite;
}
.pg--sit .lash.pg__lid {
  fill: none;
}
.pg__bow-tail {
  transform-box: view-box;
  transform-origin: 0 2px;
}
.pg--sit .pg__bow-tail--a {
  animation: pg-tail calc(3.2s * var(--motion-scale, 1)) ease-in-out infinite alternate;
}
.pg--sit .pg__bow-tail--b {
  animation: pg-tail calc(3.8s * var(--motion-scale, 1)) ease-in-out infinite alternate-reverse;
}
@keyframes pg-look {
  from {
    transform: rotate(-3deg);
  }
  to {
    transform: rotate(3.5deg) translateY(1px);
  }
}
@keyframes pg-blink {
  0%,
  92%,
  100% {
    opacity: 0;
  }
  94%,
  97% {
    opacity: 1;
  }
}
@keyframes pg-tail {
  from {
    transform: rotate(-4deg);
  }
  to {
    transform: rotate(5deg);
  }
}

/* Los globos se mecen desde el ala aunque no ande. */
.pg__balloon {
  animation: pg-float var(--dur, 3.6s) ease-in-out infinite alternate;
  animation-duration: calc(var(--dur, 3.6s) * var(--motion-scale, 1));
  animation-delay: calc(var(--delay, 0s) * var(--motion-scale, 1));
}

/* Andando: balanceo, patas alternas, cabeceo y moño que rebota. */
.is-walking .pg__torso {
  animation: pg-sway calc(0.9s * var(--motion-scale, 1)) ease-in-out infinite alternate;
}
.is-walking .pg__head {
  animation: pg-nod calc(0.45s * var(--motion-scale, 1)) ease-in-out infinite alternate;
}
.is-walking .pg__bow {
  animation: pg-bounce calc(0.45s * var(--motion-scale, 1)) ease-in-out infinite alternate;
}
.is-walking .pg__leg--a {
  animation: pg-step calc(0.9s * var(--motion-scale, 1)) ease-in-out infinite alternate;
}
.is-walking .pg__leg--b {
  animation: pg-step calc(0.9s * var(--motion-scale, 1)) ease-in-out infinite alternate-reverse;
}

@keyframes pg-sway {
  from {
    transform: translateY(0) rotate(-1.6deg);
  }
  to {
    transform: translateY(-3px) rotate(1.6deg);
  }
}
@keyframes pg-nod {
  from {
    transform: rotate(-3.5deg);
  }
  to {
    transform: rotate(3deg) translateY(1px);
  }
}
@keyframes pg-bounce {
  from {
    transform: translateY(0) scale(1);
  }
  to {
    transform: translateY(-3px) scale(1.06);
  }
}
@keyframes pg-step {
  from {
    transform: rotate(-14deg);
  }
  to {
    transform: rotate(14deg) translateY(-3px);
  }
}
@keyframes pg-float {
  from {
    transform: rotate(calc(var(--tilt, 3deg) * -1)) translateY(0);
  }
  to {
    transform: rotate(var(--tilt, 3deg)) translateY(-4px);
  }
}
@media (prefers-reduced-motion: reduce) {
  .pg__balloon,
  .pg--sit .pg__head,
  .pg--sit .pg__lid,
  .pg--sit .pg__bow-tail,
  .is-walking .pg__torso,
  .is-walking .pg__head,
  .is-walking .pg__bow,
  .is-walking .pg__leg {
    animation: none;
  }
}
</style>
