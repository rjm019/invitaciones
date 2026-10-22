<script setup lang="ts">
import { computed } from 'vue'
import farUrl from '@/effects/assets/horizonte-lejos.svg?url'
import midUrl from '@/effects/assets/horizonte-medio.svg?url'
import midLightsAUrl from '@/effects/assets/horizonte-medio-luces-a.svg?url'
import midLightsBUrl from '@/effects/assets/horizonte-medio-luces-b.svg?url'
import nearUrl from '@/effects/assets/horizonte-cerca.svg?url'
import nearLightsUrl from '@/effects/assets/horizonte-cerca-luces.svg?url'
import {
  CITY_ICONS,
  cityIcons,
  cityLights,
  discoBalls,
  discoRays,
  discoSpots,
  discoTiles,
  glitter,
  motionTime,
  searchlights,
  taxis,
} from '@/services/effectsService'
import type { ResolvedSection } from '@/types/event'

/**
 * Efectos de ambiente que pinta SectionShell detrás del contenido de una sección:
 * - reflectores (searchlights): haces de luz que barren el cielo desde abajo.
 * - luces de ciudad (city-lights): círculos suaves y desenfocados que flotan.
 * - horizonte (skyline): Manhattan al pie de la sección, en tres capas que avanzan a
 *   distinta velocidad (profundidad), con ventanas que se encienden a destiempo.
 * - escarcha (glitter): brillitos plateados que caen despacio.
 * - bola disco (disco-ball): bolas de espejos colgadas que giran de verdad (cada espejo es
 *   una cara en 3D; gira la bola entera con un solo transform), con rayos finos, destellos
 *   sobre sus espejos y sus reflejos recorriendo la sección.
 * - reflejos de bola disco (disco-lights): solo los puntos de luz que recorren la sección.
 * - íconos de la ciudad (city-icons): dibujos de línea (la Estatua, un taxi, un pretzel…) a
 *   los costados, que se mecen y se apagan y encienden.
 * - taxis (taxi): uno hacia cada lado, cruzando la sección por el pie.
 * - franja de la ciudad (icon-strip): una hilera de esos dibujos en la orilla de arriba.
 * Todo toma sus colores de la paleta (los edificios se recortan con máscaras SVG, así
 * siguen los colores de la invitación) y solo anima transform y opacity.
 */
const props = defineProps<{ section: ResolvedSection }>()

const has = (effect: string) => props.section.effects.includes(effect)
const seed = computed(() => props.section.id)

const beams = computed(() => (has('searchlights') ? searchlights(seed.value) : []))
const lights = computed(() => (has('city-lights') ? cityLights(seed.value) : []))
const specks = computed(() => (has('glitter') ? glitter(seed.value) : []))
/** Segundos que tarda un reflejo en cruzar la sección (en effects.css, la misma cuenta). */
const SPOT_TRAVEL = 24
const balls = computed(() => (has('disco-ball') ? discoBalls(seed.value) : []))
// Los espejos son los mismos en todas las bolas (la grande con más filas): cambia cómo giran.
const TILES = [discoTiles('bola', 10), discoTiles('bola-chica', 8)]
const rays = computed(() =>
  balls.value.map((_, i) => discoRays(`${seed.value}-${i}`, i === 0 ? 9 : 7)),
)
const spots = computed(() =>
  has('disco-ball') || has('disco-lights')
    ? discoSpots(seed.value, has('disco-ball') ? 26 : 20, SPOT_TRAVEL)
    : [],
)
/** Destellos sobre los espejos de cada bola (posición en % de la bola). */
const GLINTS = [
  { left: 34, top: 30, delay: 0 },
  { left: 66, top: 52, delay: -1.3 },
  { left: 44, top: 74, delay: -2.4 },
]
const skyline = computed(() => has('skyline'))
// Los dibujos de la ciudad son máscaras: toman el color de la paleta.
const iconUrls = import.meta.glob<string>('@/effects/assets/ciudad/*.svg', {
  query: '?url',
  import: 'default',
  eager: true,
})
const iconMask = (name: string) => ({
  '--fx-mask': `url("${iconUrls[`/src/effects/assets/ciudad/${name}.svg`] ?? ''}")`,
})
const icons = computed(() => (has('city-icons') ? cityIcons(seed.value) : []))
const cabs = computed(() => (has('taxi') ? taxis(seed.value) : []))
const strip = computed(() => has('icon-strip'))
// Sin panel (la portada), el ambiente llega hasta la orilla de la pantalla: un haz o la
// ciudad cortados en el margen se verían como una franja. (Difuminada ya llega sola.)
const bleed = computed(() => (props.section.panel || has('blend') ? null : 'ambience--bleed'))

const mask = (url: string) => ({ '--fx-mask': `url("${url}")` })
/** Cada capa avanza a su ritmo (segundos por vuelta): la de enfrente, más rápido, como vista desde un coche. */
const layers = [
  { name: 'far', shape: farUrl, lights: [], duration: 240 },
  { name: 'mid', shape: midUrl, lights: [midLightsAUrl, midLightsBUrl], duration: 170 },
  { name: 'near', shape: nearUrl, lights: [nearLightsUrl], duration: 120 },
]
</script>

<template>
  <div v-if="beams.length" class="ambience ambience--beams" :class="bleed" aria-hidden="true">
    <span
      v-for="(beam, i) in beams"
      :key="i"
      class="fx-beam"
      :style="{
        left: `${beam.left}%`,
        '--fx-beam-from': `${beam.from}deg`,
        '--fx-beam-to': `${beam.to}deg`,
        animationDelay: motionTime(beam.delay),
        animationDuration: motionTime(beam.duration),
      }"
    />
  </div>

  <div v-if="lights.length" class="ambience" :class="bleed" aria-hidden="true">
    <span
      v-for="(light, i) in lights"
      :key="i"
      class="fx-bokeh"
      :style="{
        top: `${light.top}%`,
        left: `${light.left}%`,
        width: `${light.size}rem`,
        '--fx-drift': `${-light.drift}px`,
        animationDelay: motionTime(light.delay),
        animationDuration: motionTime(light.duration),
      }"
    />
  </div>

  <div v-if="skyline" class="ambience ambience--skyline" :class="bleed" aria-hidden="true">
    <div class="fx-skyline-scene">
      <div
        v-for="layer in layers"
        :key="layer.name"
        class="fx-skyline-layer"
        :class="`fx-skyline-layer--${layer.name}`"
        :style="{ animationDuration: motionTime(layer.duration) }"
      >
        <span class="fx-skyline-shape" :style="mask(layer.shape)" />
        <span
          v-for="(url, i) in layer.lights"
          :key="url"
          class="fx-skyline-windows"
          :class="`fx-skyline-windows--${i ? 'b' : 'a'}`"
          :style="mask(url)"
        />
      </div>
    </div>
  </div>

  <div v-if="spots.length" class="ambience ambience--spots" :class="bleed" aria-hidden="true">
    <span
      v-for="(spot, i) in spots"
      :key="i"
      class="fx-disco-spot"
      :class="{ 'fx-disco-spot--star': spot.star, 'fx-disco-spot--twinkle': spot.twinkle }"
      :style="{
        top: `${spot.top}%`,
        width: `${spot.size}px`,
        '--fx-twinkle': spot.twinkle ? motionTime(spot.twinkle) : undefined,
        animationDelay: `${motionTime(spot.delay)}, ${motionTime(-i * 0.37)}`,
      }"
    />
  </div>

  <div v-if="balls.length" class="ambience ambience--disco" :class="bleed" aria-hidden="true">
    <div
      v-for="(ball, i) in balls"
      :key="i"
      class="fx-disco"
      :style="{
        left: `${ball.left}%`,
        top: `${ball.drop}%`,
        '--fx-disco-size': `clamp(3.25rem, ${Math.round(ball.size * 100)}cqi, 6.5rem)`,
      }"
    >
      <span class="fx-disco__chain" />
      <span class="fx-disco__rays">
        <span
          v-for="(ray, j) in rays[i]"
          :key="j"
          class="fx-disco__ray"
          :style="{
            rotate: `${ray.angle}deg`,
            height: `${Math.round(ray.length * 100)}cqi`,
            animationDelay: motionTime(ray.delay),
            animationDuration: motionTime(ray.duration),
          }"
        />
      </span>
      <span class="fx-disco__ball">
        <span class="fx-disco__core" />
        <span class="fx-disco__tilt">
          <span
            class="fx-disco__globe"
            :class="{ 'is-reverse': ball.reverse }"
            :style="{
              animationDuration: motionTime(ball.spin),
              animationDelay: motionTime(ball.delay),
            }"
          >
            <span
              v-for="(tile, k) in TILES[i % 2]"
              :key="k"
              class="fx-disco__tile"
              :style="{
                '--lon': `${tile.lon}deg`,
                '--lat': `${tile.lat}deg`,
                '--w': tile.w,
                '--h': tile.h,
                '--l': tile.light,
              }"
            />
          </span>
        </span>
        <span class="fx-disco__shade" />
        <span
          v-for="(glint, g) in GLINTS"
          :key="g"
          class="fx-disco__glint"
          :style="{
            left: `${glint.left}%`,
            top: `${glint.top}%`,
            animationDelay: motionTime(glint.delay - i * 0.8),
          }"
        />
      </span>
    </div>
  </div>

  <div v-if="icons.length" class="ambience" :class="bleed" aria-hidden="true">
    <span
      v-for="(icon, i) in icons"
      :key="i"
      class="fx-city-icon"
      :style="{
        ...iconMask(icon.name),
        top: `${icon.top}%`,
        [icon.side]: `${icon.inset}rem`,
        width: `${icon.size}rem`,
        rotate: `${icon.tilt}deg`,
        '--fx-bob': `${-icon.bob}px`,
        animationDelay: motionTime(icon.delay),
        animationDuration: motionTime(icon.duration),
      }"
    />
  </div>

  <div v-if="cabs.length" class="ambience ambience--taxis" :class="bleed" aria-hidden="true">
    <span
      v-for="(cab, i) in cabs"
      :key="i"
      class="fx-taxi-car"
      :class="{ 'fx-taxi-car--reverse': cab.reverse }"
      :style="{
        ...iconMask('taxi'),
        bottom: `${cab.bottom}rem`,
        animationDelay: motionTime(cab.delay),
        animationDuration: motionTime(cab.duration),
      }"
    />
  </div>

  <div v-if="strip" class="ambience ambience--strip" :class="bleed" aria-hidden="true">
    <div class="fx-strip">
      <span
        v-for="name in CITY_ICONS"
        :key="name"
        class="fx-strip__icon"
        :style="iconMask(name)"
      />
    </div>
  </div>

  <div v-if="specks.length" class="ambience" :class="bleed" aria-hidden="true">
    <span
      v-for="(speck, i) in specks"
      :key="i"
      class="fx-speck"
      :class="{ 'fx-speck--star': speck.star }"
      :style="{
        top: `${speck.top}%`,
        left: `${speck.left}%`,
        width: `${speck.size}px`,
        '--fx-fall': `${speck.fall}px`,
        '--fx-sway': `${speck.sway}px`,
        animationDelay: motionTime(speck.delay),
        animationDuration: motionTime(speck.duration),
      }"
    />
  </div>
</template>

<style scoped>
.ambience {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  /* Medidas contra el ancho de la sección (cqi), no de la pantalla. */
  container-type: inline-size;
}
.ambience--bleed {
  inset: calc(-1 * var(--section-gap, 1rem));
}
</style>
