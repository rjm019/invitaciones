<script setup lang="ts">
import { computed } from 'vue'
import CribMobile from '@/components/ui/CribMobile.vue'
import MariachiBand from '@/components/ui/MariachiBand.vue'
import FlyingStork from '@/components/ui/FlyingStork.vue'
import PartyGoose from '@/components/ui/PartyGoose.vue'
import RibbonBow from '@/components/ui/RibbonBow.vue'
import RibbonGarland from '@/components/ui/RibbonGarland.vue'
import doilyUrl from '@/themes/_shared/assets/encaje.svg?url'
import drapeUrl from '@/themes/_shared/assets/cortinaje.svg?url'
import bunting from '@/themes/_shared/assets/papel-picado.svg?url'
import heartUrl from '@/themes/_shared/assets/corazon-sagrado.svg?url'
import sarapeUrl from '@/themes/_shared/assets/sarape.svg?url'
import gerberaPink from '@/themes/_shared/assets/gerbera.svg?url'
import gerberaOrange from '@/themes/_shared/assets/gerbera-naranja.svg?url'
import gerberaRed from '@/themes/_shared/assets/gerbera-roja.svg?url'
import gerberaPale from '@/themes/_shared/assets/gerbera-palo.svg?url'
import marigoldFlower from '@/themes/_shared/assets/cempasuchil.svg?url'
import cloudUrl from '@/themes/_shared/assets/nube.svg?url'
import tile1 from '@/themes/_shared/assets/azulejo-1.svg?url'
import tile2 from '@/themes/_shared/assets/azulejo-2.svg?url'
import tile3 from '@/themes/_shared/assets/azulejo-3.svg?url'
import tile4 from '@/themes/_shared/assets/azulejo-4.svg?url'
import laceBottomUrl from '@/effects/assets/encaje-abajo.svg?url'
import laceTopUrl from '@/effects/assets/encaje-arriba.svg?url'
import {
  balloonFlights,
  bloomFlowers,
  cloudDrifts,
  daisyRow,

  buntingFlags,
  flipTiles,
  laceDoilies,
  laceStrokes,
  lightDust,
  marigoldPetals,
  motionTime,
  musicNotes,
  pearlBeads,
  pearlStrands,
  petals,
  ribbonCurls,
  soapBubbles,
  storkFlights,
  tulleVeils,
} from '@/services/effectsService'
import type { ResolvedSection } from '@/types/event'

/**
 * Efectos de tela y encaje que pinta SectionShell detrás del contenido (tema `encaje`,
 * pero cualquier tema los puede pedir por nombre). Cada uno es su propia capa, que se
 * pausa y se oculta cuando la sección está lejos de la pantalla (.is-idle):
 * - encaje_giratorio (lace-spin): carpetas de encaje que giran lento en las esquinas.
 * - encaje_ondulante (lace-wave): las orillas de encaje se mecen como tela con brisa.
 * - encaje_dibujado (lace-draw): una flor de encaje que se dibuja trazo a trazo al entrar.
 * - foco (spotlight) y foco_viaja (spotlight-travel): luz de escenario, fija o que recorre.
 * - perlas_destello (pearl-glint): un collar al borde con un destello que lo recorre.
 * - satin_brillo (satin-sweep): un barrido de brillo de satén sobre el fondo.
 * - cortinaje_mece (drape-sway): guirnaldas de gasa que se balancean arriba.
 * - perlas_cuelgan (pearl-strands): hilos de perlas que caen al entrar y se balancean.
 * - petalos (petals): pétalos blancos que caen despacio.
 * - polvo_luz (light-dust): motas de luz que suben y se encienden.
 * - tul_respira (tulle-breathe): velos en las orillas que respiran, como cortinas con brisa.
 * - papel_picado (papel-picado): dos hileras de banderas de papel picado que se mecen arriba.
 * - cempasuchil (marigold): pétalos naranjas, rosas y amarillos que caen.
 * - flores_brotan (bloom): gerberas y cempasúchil que brotan en dos esquinas al entrar.
 * - corazon_late (heartbeat): el corazón sagrado late y sus rayos giran despacio.
 * - notas (music-notes): notas musicales que suben y se desvanecen.
 * - sarape (sarape-drift): una franja de sarape al pie que se desliza de lado.
 * - azulejos_voltean (tile-flip): una cenefa de azulejos que se voltean uno tras otro al entrar.
 * - mariachis (mariachi-band): el trío de mariachis, chico, al pie, tocando con sus notas.
 * - globos (balloons): globos con hilo que suben por los costados, meciéndose.
 * - listones (ribbon-curls): rizos de listón que cuelgan de las esquinas de arriba y se mecen.
 * - lazo_se_ata (bow-tie): un moño arriba al centro que se ata al entrar y mece sus colas.
 * - nubes (clouds): nubes suaves que cruzan despacio, en dos capas.
 * - movil (crib-mobile): un móvil de cuna chico, colgado arriba, que se balancea.
 * - margaritas (daisies): hilera de margaritas al pie que brotan una tras otra.
 * - burbujas (bubbles): burbujas de jabón que suben y se desvanecen.
 * - gansito (goose-walk): el gansito, con dos globos, cruza la sección por el pie.
 * - guirnalda (garland): el moño grande con dos listones en guirnalda, hojas y bayas arriba, a todo el ancho.
 * - ciguena (stork-flight): una cigüeña con su bultito cruza la franja de arriba; más tarde, otra al revés.
 * Solo se anima transform, opacity y las propiedades individuales translate/rotate/scale
 * (que no repintan); nada de blur ni sombras animadas. `entered` arranca las entradas.
 */
const props = defineProps<{ section: ResolvedSection; entered: boolean }>()

const has = (effect: string) => props.section.effects.includes(effect)
const seed = computed(() => props.section.id)
// Sin panel (la portada) la capa llega a la orilla de la pantalla.
const bleed = computed(() => (props.section.panel || has('blend') ? null : 'fab--bleed'))
const stateClass = computed(() => ({ 'is-in': props.entered }))

const mask = (url: string) => ({ '--fab-mask': `url("${url}")` })

const doilies = computed(() => (has('lace-spin') ? laceDoilies(seed.value) : []))
const lace = computed(() => has('lace-wave'))
const draw = computed(() => has('lace-draw'))
const strokes = laceStrokes()
const spot = computed<'spot' | 'travel' | null>(() =>
  has('spotlight-travel') ? 'travel' : has('spotlight') ? 'spot' : null,
)
const beads = computed(() => (has('pearl-glint') ? pearlBeads() : []))
const satin = computed(() => has('satin-sweep'))
const drape = computed(() => has('drape-sway'))
const strands = computed(() => (has('pearl-strands') ? pearlStrands(seed.value) : []))
const falling = computed(() => (has('petals') ? petals(seed.value) : []))
const motes = computed(() => (has('light-dust') ? lightDust(seed.value) : []))
const veils = computed(() => (has('tulle-breathe') ? tulleVeils(seed.value) : []))
const flags = computed(() => (has('papel-picado') ? buntingFlags(seed.value) : []))
const marigolds = computed(() => (has('marigold') ? marigoldPetals(seed.value) : []))
const blooms = computed(() => (has('bloom') ? bloomFlowers(seed.value) : []))
const heart = computed(() => has('heartbeat'))
const notes = computed(() => (has('music-notes') ? musicNotes(seed.value) : []))
const sarape = computed(() => has('sarape-drift'))
const band = computed(() => has('mariachi-band'))
const tiles = computed(() => (has('tile-flip') ? flipTiles(seed.value) : []))
const balloons = computed(() => (has('balloons') ? balloonFlights(seed.value) : []))
const curls = computed(() => (has('ribbon-curls') ? ribbonCurls(seed.value) : []))
const bowTie = computed(() => has('bow-tie'))
const clouds = computed(() => (has('clouds') ? cloudDrifts(seed.value) : []))
const cribMobile = computed(() => has('crib-mobile'))
const daisies = computed(() => (has('daisies') ? daisyRow(seed.value) : []))
const bubbles = computed(() => (has('bubbles') ? soapBubbles(seed.value) : []))
const goose = computed(() => has('goose-walk'))
const garland = computed(() => has('garland'))
const storks = computed(() => (has('stork-flight') ? storkFlights(seed.value) : []))
// Las ocho puntas de cada margarita: el mismo dibujo, girado.
const DAISY_PETALS = Array.from({ length: 8 }, (_, i) => i * 45)
const bloomArt = [gerberaPink, gerberaOrange, gerberaRed, gerberaPale, marigoldFlower]
const tileArt = [tile1, tile2, tile3, tile4]
</script>

<template>
  <div v-if="doilies.length" class="ambience fab" :class="[bleed, stateClass]" aria-hidden="true">
    <span
      v-for="(d, i) in doilies"
      :key="i"
      class="fab-doily"
      :class="{ 'is-reverse': d.reverse }"
      :style="{
        ...mask(doilyUrl),
        top: `${d.top}%`,
        left: `${d.left}%`,
        width: `${d.size}cqi`,
        animationDuration: motionTime(d.spin),
        animationDelay: motionTime(d.delay),
      }"
    />
  </div>

  <div v-if="lace" class="ambience fab" :class="[bleed, stateClass]" aria-hidden="true">
    <span class="fab-lace fab-lace--top" :style="mask(laceTopUrl)" />
    <span class="fab-lace fab-lace--bottom" :style="mask(laceBottomUrl)" />
  </div>

  <div v-if="draw" class="ambience fab fab--draw" :class="[bleed, stateClass]" aria-hidden="true">
    <svg
      v-for="corner in ['a', 'b']"
      :key="corner"
      class="fab-draw"
      :class="`fab-draw--${corner}`"
      viewBox="-100 -100 200 200"
    >
      <template v-for="(s, i) in strokes" :key="i">
        <circle
          v-if="s.kind === 'ring'"
          class="fab-stroke"
          cx="0"
          cy="0"
          :r="s.r"
          :style="{ animationDelay: motionTime(s.delay) }"
        />
        <g v-else :transform="`rotate(${s.angle})`">
          <ellipse
            v-if="s.kind === 'petal'"
            class="fab-stroke"
            cx="0"
            :cy="-s.r"
            rx="9"
            ry="22"
            :style="{ animationDelay: motionTime(s.delay) }"
          />
          <circle
            v-else
            class="fab-stroke fab-stroke--dot"
            cx="0"
            :cy="-s.r"
            r="2.8"
            :style="{ animationDelay: motionTime(s.delay) }"
          />
        </g>
      </template>
    </svg>
  </div>

  <div
    v-if="spot"
    class="ambience fab fab--spot"
    :class="[bleed, stateClass, `fab--spot-${spot}`]"
    aria-hidden="true"
  >
    <span class="fab-dim" />
    <span class="fab-beam" />
  </div>

  <div v-if="beads.length" class="ambience fab" :class="[bleed, stateClass]" aria-hidden="true">
    <span
      v-for="(b, i) in beads"
      :key="i"
      class="fab-pearl"
      :style="{
        left: `${b.left}%`,
        '--fab-sag': `${b.sag}px`,
        '--fab-glint-delay': motionTime(b.delay),
      }"
    />
  </div>

  <div v-if="satin" class="ambience fab" :class="[bleed, stateClass]" aria-hidden="true">
    <span class="fab-satin" />
    <span class="fab-satin fab-satin--thin" />
  </div>

  <div v-if="drape" class="ambience fab" :class="[bleed, stateClass]" aria-hidden="true">
    <span class="fab-drape fab-drape--back" :style="{ backgroundImage: `url('${drapeUrl}')` }" />
    <span class="fab-drape" :style="{ backgroundImage: `url('${drapeUrl}')` }" />
  </div>

  <div v-if="strands.length" class="ambience fab" :class="[bleed, stateClass]" aria-hidden="true">
    <span
      v-for="(s, i) in strands"
      :key="i"
      class="fab-strand"
      :style="{
        left: `${s.left}%`,
        height: `${s.length}rem`,
        '--fab-swing': `${s.swing}deg`,
        '--fab-drop-delay': motionTime(s.drop),
        '--fab-swing-time': motionTime(s.duration),
        '--fab-swing-delay': motionTime(s.delay),
      }"
    />
  </div>

  <div v-if="falling.length" class="ambience fab" :class="[bleed, stateClass]" aria-hidden="true">
    <span
      v-for="(p, i) in falling"
      :key="i"
      class="fab-petal"
      :style="{
        left: `${p.left}%`,
        top: `${p.top}%`,
        width: `${p.size * 0.62}px`,
        height: `${p.size}px`,
        '--fab-fall': `${p.fall}px`,
        '--fab-sway': `${p.sway}px`,
        '--fab-turn': `${p.turn}deg`,
        animationDelay: motionTime(p.delay),
        animationDuration: motionTime(p.duration),
      }"
    />
  </div>

  <div v-if="motes.length" class="ambience fab" :class="[bleed, stateClass]" aria-hidden="true">
    <span
      v-for="(m, i) in motes"
      :key="i"
      class="fab-mote"
      :style="{
        top: `${m.top}%`,
        left: `${m.left}%`,
        width: `${m.size}px`,
        '--fab-rise': `${-m.rise}px`,
        animationDelay: motionTime(m.delay),
        animationDuration: motionTime(m.duration),
      }"
    />
  </div>

  <div v-if="veils.length" class="ambience fab" :class="[bleed, stateClass]" aria-hidden="true">
    <span
      v-for="(v, i) in veils"
      :key="i"
      class="fab-tulle"
      :class="`fab-tulle--${v.side}`"
      :style="{
        width: `${v.width}cqi`,
        '--fab-skew': `${v.skew}deg`,
        animationDelay: motionTime(v.delay),
        animationDuration: motionTime(v.duration),
      }"
    />
  </div>

  <div v-if="flags.length" class="ambience fab" :class="[bleed, stateClass]" aria-hidden="true">
    <span v-for="row in [0, 1]" :key="`s${row}`" class="fab-string" :class="`fab-string--r${row}`" />
    <span
      v-for="(f, i) in flags"
      :key="i"
      class="fab-flag"
      :class="`fab-flag--c${f.color}`"
      :style="{
        ...mask(bunting),
        left: `${f.left}%`,
        '--fab-x': f.left / 100,
        '--fab-row': f.row,
        '--fab-sway': `${f.sway}deg`,
        animationDuration: motionTime(f.duration),
        animationDelay: motionTime(f.delay),
      }"
    />
  </div>

  <div v-if="marigolds.length" class="ambience fab" :class="[bleed, stateClass]" aria-hidden="true">
    <span
      v-for="(p, i) in marigolds"
      :key="i"
      class="fab-marigold"
      :class="`fab-marigold--t${p.tone}`"
      :style="{
        left: `${p.left}%`,
        top: `${p.top}%`,
        width: `${p.size * 0.62}px`,
        height: `${p.size}px`,
        '--fab-fall': `${p.fall}px`,
        '--fab-sway': `${p.sway}px`,
        '--fab-turn': `${p.turn}deg`,
        animationDelay: motionTime(p.delay),
        animationDuration: motionTime(p.duration),
      }"
    />
  </div>

  <div v-if="blooms.length" class="ambience fab" :class="[bleed, stateClass]" aria-hidden="true">
    <span
      v-for="(b, i) in blooms"
      :key="i"
      class="fab-bloom"
      :class="`fab-bloom--${b.corner}`"
      :style="{
        backgroundImage: `url('${bloomArt[b.kind]}')`,
        '--fab-x': `${b.x}rem`,
        '--fab-y': `${b.y}rem`,
        '--fab-size': `${b.size}rem`,
        '--fab-sway': `${b.sway}deg`,
        '--fab-grow-delay': motionTime(b.delay),
        '--fab-sway-time': motionTime(b.duration),
        '--fab-sway-delay': motionTime(b.delay + 1),
      }"
    />
  </div>

  <div v-if="heart" class="ambience fab" :class="[bleed, stateClass]" aria-hidden="true">
    <svg class="fab-heart" viewBox="0 22 240 256">
      <use class="fab-heart__rays" :href="`${heartUrl}#rayos`" />
      <use class="fab-heart__core" :href="`${heartUrl}#corazon`" />
    </svg>
  </div>

  <div v-if="notes.length" class="ambience fab" :class="[bleed, stateClass]" aria-hidden="true">
    <span
      v-for="(n, i) in notes"
      :key="i"
      class="fab-note"
      :style="{
        left: `${n.left}%`,
        fontSize: `${n.size}rem`,
        '--fab-rise': `${-n.rise}px`,
        '--fab-drift': `${n.drift}px`,
        animationDelay: motionTime(n.delay),
        animationDuration: motionTime(n.duration),
      }"
      >{{ n.glyph ? '♫' : '♪' }}</span
    >
  </div>

  <div v-if="sarape" class="ambience fab" :class="[bleed, stateClass]" aria-hidden="true">
    <span class="fab-sarape" :style="{ backgroundImage: `url('${sarapeUrl}')` }" />
  </div>

  <div v-if="tiles.length" class="ambience fab" :class="[bleed, stateClass]" aria-hidden="true">
    <div class="fab-tiles">
      <span
        v-for="(t, i) in tiles"
        :key="i"
        class="fab-tile"
        :style="{
          backgroundImage: `url('${tileArt[t.tile - 1]}')`,
          '--fab-flip-delay': motionTime(t.delay),
        }"
      />
    </div>
  </div>

  <div v-if="band" class="ambience fab" :class="[bleed, stateClass]" aria-hidden="true">
    <div class="fab-band"><MariachiBand :playing="true" size="sm" /></div>
  </div>

  <div v-if="balloons.length" class="ambience fab fab--tall" :class="[bleed, stateClass]" aria-hidden="true">
    <span
      v-for="(b, i) in balloons"
      :key="i"
      class="fab-balloon"
      :class="`fab-balloon--t${b.tone}`"
      :style="{
        left: `${b.left}%`,
        width: `${b.size}rem`,
        '--fab-drift': `${b.drift}px`,
        animationDelay: motionTime(b.delay),
        animationDuration: motionTime(b.duration),
      }"
    />
  </div>

  <div v-if="curls.length" class="ambience fab" :class="[bleed, stateClass]" aria-hidden="true">
    <svg
      v-for="(c, i) in curls"
      :key="i"
      class="fab-curl"
      :class="`fab-curl--${c.corner}`"
      viewBox="0 0 40 120"
      preserveAspectRatio="none"
      :style="{
        [c.corner === 'l' ? 'left' : 'right']: `${c.x}rem`,
        height: `${c.length}rem`,
        '--fab-sway': `${c.sway}deg`,
        animationDuration: motionTime(c.duration),
        animationDelay: motionTime(c.delay),
      }"
    >
      <path class="fab-curl__ribbon" d="M20 0V6C1 8 1 28 20 30C39 32 39 50 20 52C1 54 1 72 20 74C39 76 39 92 20 94C8 96 8 108 20 110" />
      <path class="fab-curl__glint" d="M20 0V6C1 8 1 28 20 30C39 32 39 50 20 52C1 54 1 72 20 74C39 76 39 92 20 94C8 96 8 108 20 110" />
    </svg>
  </div>

  <div v-if="bowTie" class="ambience fab" :class="[bleed, stateClass]" aria-hidden="true">
    <div class="fab-bowtie"><RibbonBow :tied="entered" :sway="entered" size="5.6rem" /></div>
  </div>

  <div v-if="clouds.length" class="ambience fab" :class="[bleed, stateClass]" aria-hidden="true">
    <span
      v-for="(c, i) in clouds"
      :key="i"
      class="fab-cloud"
      :class="`fab-cloud--l${c.layer}`"
      :style="{
        ...mask(cloudUrl),
        top: `${c.top}%`,
        width: `${c.width}cqi`,
        animationDuration: motionTime(c.duration),
        animationDelay: motionTime(c.delay),
      }"
    />
  </div>

  <div v-if="cribMobile" class="ambience fab" :class="[bleed, stateClass]" aria-hidden="true">
    <div class="fab-mobile"><CribMobile :playing="true" size="6.4rem" /></div>
  </div>

  <div v-if="daisies.length" class="ambience fab" :class="[bleed, stateClass]" aria-hidden="true">
    <svg
      v-for="(d, i) in daisies"
      :key="i"
      class="fab-daisy"
      viewBox="0 0 60 100"
      :style="{
        left: `${d.left}%`,
        width: `${d.size}rem`,
        '--fab-sway': `${d.sway}deg`,
        '--fab-grow-delay': motionTime(d.delay),
        '--fab-sway-time': motionTime(d.duration),
        '--fab-sway-delay': motionTime(d.delay + 1),
      }"
    >
      <path class="fab-daisy__stem" d="M30 34C28 58 32 80 30 100" />
      <path class="fab-daisy__leaf" d="M30 70C20 70 12 64 8 54C20 52 28 58 30 70Z" />
      <path class="fab-daisy__leaf" d="M30 86C40 86 48 80 52 70C40 68 32 74 30 86Z" />
      <g class="fab-daisy__head">
        <ellipse
          v-for="a in DAISY_PETALS"
          :key="a"
          class="fab-daisy__petal"
          cx="30"
          cy="12"
          rx="5.4"
          ry="11"
          :transform="`rotate(${a} 30 30)`"
        />
        <circle class="fab-daisy__eye" cx="30" cy="30" r="6.4" />
      </g>
    </svg>
  </div>

  <div v-if="bubbles.length" class="ambience fab fab--tall" :class="[bleed, stateClass]" aria-hidden="true">
    <span
      v-for="(b, i) in bubbles"
      :key="i"
      class="fab-bubble"
      :style="{
        left: `${b.left}%`,
        width: `${b.size}px`,
        '--fab-rise': b.rise,
        '--fab-drift': `${b.drift}px`,
        animationDelay: motionTime(b.delay),
        animationDuration: motionTime(b.duration),
      }"
    />
  </div>

  <div v-if="goose" class="ambience fab" :class="[bleed, stateClass]" aria-hidden="true">
    <div class="fab-goose fab-goose--ltr"><PartyGoose :walking="true" :balloons="2" size="4.6rem" /></div>
    <div class="fab-goose fab-goose--rtl"><PartyGoose :walking="true" :balloons="2" :flip="true" size="4.6rem" /></div>
  </div>

  <div v-if="garland" class="ambience fab" :class="[bleed, stateClass]" aria-hidden="true">
    <div class="fab-garland"><RibbonGarland :tied="entered" :sway="entered" /></div>
  </div>

  <div v-if="storks.length" class="ambience fab" :class="[bleed, stateClass]" aria-hidden="true">
    <div
      v-for="(k, i) in storks"
      :key="i"
      class="fab-stork"
      :class="k.reverse ? 'fab-stork--rtl' : 'fab-stork--ltr'"
      :style="{
        top: `${k.top}rem`,
        animationDuration: motionTime(k.duration),
        animationDelay: motionTime(k.delay),
      }"
    >
      <div
        class="fab-stork__wave"
        :style="{ '--fab-wave': `${k.wave}px`, animationDuration: motionTime(k.waveTime) }"
      >
        <FlyingStork :flying="true" :flip="k.reverse" :size="`${k.size}rem`" />
      </div>
    </div>
  </div>
</template>
