<script setup lang="ts">
import { computed } from 'vue'
import { useEvent } from '@/composables/useEvent'
import { decorOr } from '@/services/decorService'
import type { ResolvedSection } from '@/types/event'

/**
 * Cierre bordado ("bordado"): la despedida sobre la tela arrugada al pie de la sección
 * (ranura "tela"), con un alcatraz a cada lado (ranura "alcatraz") y la firma en letra de
 * pluma (el nombre corto de la festejada o de la pareja). Sirve en cualquier tema.
 */
const props = defineProps<{ section: ResolvedSection }>()
const { event, resolveAsset } = useEvent()

const title = computed(() => props.section.title ?? '¡Te esperamos!')
const cloth = computed(() => decorOr(props.section.decor, 'cloth', resolveAsset.value('tela-pie.svg')))
const lily = computed(() => decorOr(props.section.decor, 'lily', resolveAsset.value('alcatraz.svg')))
const signature = computed(
  () => event.value.celebrant.short_name || event.value.celebrant.full_name || event.value.title,
)
</script>

<template>
  <div class="stitch">
    <img v-if="lily" :src="lily" alt="" class="stitch__lily stitch__lily--left" />
    <img v-if="lily" :src="lily" alt="" class="stitch__lily stitch__lily--right" />
    <div class="stitch__body">
      <h2 class="stitch__title" data-text="title">{{ title }}</h2>
      <p v-if="section.text" class="stitch__text" data-text="text">{{ section.text }}</p>
      <p v-if="signature" class="stitch__signature" data-text="signature">{{ signature }}</p>
    </div>
    <img v-if="cloth" :src="cloth" alt="" class="stitch__cloth" />
  </div>
</template>

<style scoped>
.stitch {
  container-type: inline-size;
  position: relative;
  display: grid;
  justify-items: center;
  /* el espacio de abajo es la tela arrugada */
  padding-bottom: clamp(3.5rem, 22cqi, 6rem);
  text-align: center;
}
.stitch__body {
  position: relative;
  z-index: 1;
  display: grid;
  justify-items: center;
  gap: var(--space-1);
  max-width: 20rem;
}
.stitch__title {
  margin: 0;
  font-family: var(--t-title-font, var(--font-script));
  font-weight: 400;
  font-size: calc(clamp(2.4rem, 12cqi, 3.6rem) * var(--t-title-size, 1));
  line-height: 1.05;
  color: var(--t-title-color, var(--color-primary));
}
.stitch__text {
  margin: 0;
  font-family: var(--t-text-font, var(--font-serif));
  font-size: calc(1.1rem * var(--t-text-size, 1));
  line-height: 1.5;
  color: var(--t-text-color, var(--color-text));
}
.stitch__signature {
  margin: var(--space-1) 0 0;
  font-family: var(--t-signature-font, var(--font-script));
  font-size: calc(clamp(1.8rem, 9cqi, 2.6rem) * var(--t-signature-size, 1));
  line-height: 1;
  color: var(--t-signature-color, var(--color-primary));
}
.stitch__lily {
  position: absolute;
  bottom: 8%;
  z-index: 1;
  width: clamp(3.5rem, 18cqi, 5.5rem);
  filter: drop-shadow(0 4px 6px rgb(0 0 0 / 0.3));
}
.stitch__lily--left {
  left: 2%;
  transform: rotate(-6deg);
}
.stitch__lily--right {
  right: 2%;
  transform: scaleX(-1) rotate(-4deg);
}
.stitch__cloth {
  position: absolute;
  left: 0;
  bottom: 0;
  width: 100%;
  height: clamp(3.5rem, 22cqi, 6rem);
  object-fit: fill;
  pointer-events: none;
}
</style>
