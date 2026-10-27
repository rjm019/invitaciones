<script setup lang="ts">
import { computed } from 'vue'
import doilyUrl from '@/themes/_shared/assets/encaje.svg?url'
import drapeUrl from '@/themes/_shared/assets/cortinaje.svg?url'
import laceBottomUrl from '@/effects/assets/encaje-abajo.svg?url'
import laceTopUrl from '@/effects/assets/encaje-arriba.svg?url'
import {
  laceDoilies,
  laceStrokes,
  lightDust,
  motionTime,
  pearlBeads,
  pearlStrands,
  petals,
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
</template>
