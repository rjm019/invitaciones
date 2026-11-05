<script setup lang="ts">
import { computed } from 'vue'
import { useReducedMotion } from '@/composables/useReducedMotion'
import { splitLetters } from '@/services/effectsService'
import {
  LETTER_EFFECTS,
  letterStep,
  textEffect,
  type TextEffect,
} from '@/services/textEffectService'

/**
 * Un texto con el efecto de texto de su sección (máquina de escribir, letras estampadas,
 * tinta que se seca, caligrafía que se traza, pan de oro o letterpress; ver
 * textEffectService y effects/text.css). Va DENTRO del título (o del nombre): hereda su
 * letra, color y tamaño.
 *
 * El texto real siempre está en el DOM: con efectos por letra, el texto completo va para el
 * lector de pantalla y las letras sueltas van ocultas para él; con los demás, el texto es el
 * mismo nodo. Arranca cuando la sección se ve (la clase is-visible de SectionShell) o, con
 * `active`, cuando el componente lo dice (la portada, al abrir el sobre). Con "menos
 * movimiento" se ve completo y quieto.
 */
const props = withDefaults(
  defineProps<{
    text: string
    effects?: readonly string[]
    /** Solo estos efectos le aplican (p. ej. el "&" solo con caligrafía). */
    allow?: readonly TextEffect[]
    /** Sin definir: arranca con la sección. true/false: lo controla quien lo usa. */
    active?: boolean
    /** Máquina de escribir encadenada: ms de espera antes de la primera letra (a velocidad 1). */
    delay?: number
    /** ms entre letras, en lugar del que calcula el servicio (para escribir toda una portada). */
    step?: number
    /** false: el último carácter no parpadea al final (otro texto sigue escribiéndose). */
    endCaret?: boolean
  }>(),
  { effects: () => [], allow: undefined, active: undefined, delay: 0, step: undefined, endCaret: true },
)
const reduced = useReducedMotion()

const effect = computed(() => (reduced.value ? null : textEffect(props.effects, props.allow)))
const letters = computed(() =>
  effect.value && LETTER_EFFECTS.includes(effect.value) ? splitLetters(props.text) : null,
)
const step = computed(() =>
  effect.value && letters.value
    ? (props.step ?? letterStep(effect.value, letters.value.count))
    : 0,
)
const play = computed(() =>
  props.active === undefined ? undefined : props.active ? 'go' : 'wait',
)
const style = computed(() =>
  step.value
    ? { '--fxt-step': `${step.value}ms`, ...(props.delay ? { '--fxt-delay': `${props.delay}ms` } : {}) }
    : undefined,
)
</script>

<template>
  <span v-if="!effect" class="fxt">{{ text }}</span>
  <span
    v-else-if="letters"
    class="fxt"
    :class="`fxt--${effect}`"
    :data-play="play"
    :style="style"
  >
    <span class="fxt__read">{{ text }}</span>
    <template v-for="(word, w) in letters.words" :key="w">
      <span class="fxt__word" aria-hidden="true"
        ><span
          v-for="letter in word"
          :key="letter.index"
          class="fxt__ch"
          :class="{ 'fxt__ch--last': endCaret && letter.index === letters.count - 1 }"
          :data-c="letter.char"
          :style="{ '--i': letter.index }"
          >{{ letter.char }}</span
        ></span
      >{{ w < letters.words.length - 1 ? ' ' : '' }}
    </template>
  </span>
  <span v-else-if="effect === 'calligraphy'" class="fxt fxt--calligraphy" :data-play="play">
    <span class="fxt__wipe"><span class="fxt__ink">{{ text }}</span></span>
  </span>
  <span v-else-if="effect === 'gold-leaf'" class="fxt fxt--gold-leaf" :data-play="play">
    {{ text }}<span class="fxt__gleam" aria-hidden="true"
      ><span class="fxt__gleam-text">{{ text }}</span></span
    >
  </span>
  <span v-else class="fxt" :class="`fxt--${effect}`" :data-play="play">{{ text }}</span>
</template>
