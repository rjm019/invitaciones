<script setup lang="ts">
import { computed, ref } from 'vue'
import { useInView } from '@/composables/useInView'
import { useReducedMotion } from '@/composables/useReducedMotion'
import { motionTime, splitLetters } from '@/services/effectsService'

/**
 * Texto que se "escribe" letra por letra al entrar a la pantalla (efecto "escribir").
 * Sin el efecto, o con "menos movimiento", se ve completo. El lector de pantalla lee el
 * texto entero: las letras sueltas van ocultas para él.
 */
const props = withDefaults(
  defineProps<{
    text: string
    active: boolean
    /** ms para escribirlo todo */ duration?: number
  }>(),
  { duration: 1200 },
)
const reduced = useReducedMotion()

const letters = computed(() => splitLetters(props.text))
const typing = computed(() => props.active && !reduced.value)
const step = computed(() => props.duration / Math.max(1, letters.value.count))

const root = ref<HTMLElement | null>(null)
const shown = useInView(root)
</script>

<template>
  <span ref="root" class="typewriter" :class="{ 'is-typing': typing, 'is-shown': shown }">
    <template v-if="typing">
      <span class="typewriter__read">{{ text }}</span>
      <!-- Un espacio de verdad entre palabras (para copiar el texto y para que el renglón corte ahí) -->
      <template v-for="(word, w) in letters.words" :key="w">
        <span class="typewriter__word" aria-hidden="true">
          <span
            v-for="letter in word"
            :key="letter.index"
            class="typewriter__letter"
            :style="{ transitionDelay: motionTime(Math.round(letter.index * step), 'ms') }"
            >{{ letter.char }}</span
          >
        </span>
        {{ w < letters.words.length - 1 ? ' ' : '' }}
      </template>
    </template>
    <template v-else>{{ text }}</template>
  </span>
</template>

<style scoped>
.typewriter__word {
  display: inline-block;
  white-space: nowrap;
}
.typewriter__letter {
  transition: opacity calc(0.25s * var(--motion-scale)) ease;
}
.is-typing:not(.is-shown) .typewriter__letter {
  opacity: 0;
}
/* Solo para lectores de pantalla. */
.typewriter__read {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
</style>
