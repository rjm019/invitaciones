<script setup lang="ts">
import RsvpSection from '@/components/sections/RsvpSection.vue'
import WaxSeal from '@/components/ui/WaxSeal.vue'
import type { ResolvedSection } from '@/types/event'

/**
 * Confirmación en tarjeta de respuesta ("tarjeta-rsvp"): la de siempre (misma lógica y mismo
 * formulario, `RsvpSection`) impresa en una tarjeta de papel con las esquinas recortadas y
 * el filete (`paper-notched`), y un lacre pequeño con el monograma prendido arriba, como la
 * tarjeta que se devuelve en su sobre. Los campos van sin caja: solo una línea, como en una
 * tarjeta para llenar a mano.
 */
defineProps<{ section: ResolvedSection }>()
</script>

<template>
  <div class="rr">
    <WaxSeal class="rr__seal" tone="burgundy" size="3.6rem" seed="respuesta" />
    <div class="rr__card paper-notched" data-fillet="burgundy">
      <RsvpSection :section="section" />
    </div>
  </div>
</template>

<style scoped>
.rr {
  position: relative;
  max-width: 28rem;
  margin: 0 auto;
  padding-top: 1.6rem;
  filter: drop-shadow(0 1px 1px rgb(59 52 46 / 0.12)) drop-shadow(0 12px 18px rgb(59 52 46 / 0.2));
}
.rr__seal {
  position: absolute;
  left: 50%;
  top: 0;
  z-index: 1;
  transform: translateX(-50%);
}
.rr__card {
  padding: 2.8rem 1.5rem 2rem;
  color: var(--color-text);
  background:
    url('../../../effects/assets/textura-algodon.svg') 0 0 / 320px,
    var(--color-paper, var(--color-surface));
}
.rr :deep(.rsvp) {
  max-width: none;
}
.rr :deep(.rsvp__card) {
  border-radius: 0;
  background: none;
}
.rr :deep(.rsvp__body) {
  padding: 0;
}
.rr :deep(.rsvp__title) {
  font-family: var(--t-title-font, var(--font-display));
  font-size: calc(clamp(1.6rem, 7.5cqi, 2.1rem) * var(--t-title-size, 1));
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--t-title-color, var(--color-text));
}
.rr :deep(.rsvp__subtitle) {
  margin-top: 0.6rem;
  font-family: var(--t-subtitle-font, var(--font-serif));
  font-style: italic;
  font-size: calc(1.08rem * var(--t-subtitle-size, 1));
  text-transform: none;
}
.rr :deep(.rsvp__deadline) {
  margin-top: 0.9rem;
  font-family: var(--t-deadline-font, var(--font-caps));
  font-size: calc(0.74rem * var(--t-deadline-size, 1));
  letter-spacing: 0.26em;
  color: var(--t-deadline-color, var(--color-borgona, var(--color-accent)));
}
.rr :deep(.rsvp__button) {
  margin-top: 1rem;
  padding: 0.6rem 1.2rem;
  font-family: var(--t-button-font, var(--font-caps));
  font-size: calc(0.74rem * var(--t-button-size, 1));
  font-weight: 700;
}
/* El formulario: sin caja ni sombra, los campos como renglones para llenar a mano. */
.rr :deep(.rsvp__form) {
  margin-top: 1.2rem;
}
.rr :deep(.guest-form) {
  padding: 1.2rem 0 0;
  background: none;
  box-shadow: none;
  border-top: 1px solid color-mix(in srgb, var(--color-text) 14%, transparent);
}
.rr :deep(.guest-form__label) {
  font-family: var(--font-caps);
  font-weight: 600;
  font-size: 0.78rem;
  letter-spacing: 0.26em;
}
.rr :deep(.guest-form__input),
.rr :deep(.guest-form__locked) {
  border-width: 0 0 1px;
  border-radius: 0;
  background: transparent;
  padding-inline: 0.2rem;
}
.rr :deep(.guest-form__submit) {
  border: 1px solid currentColor;
  border-radius: 2px;
  background: transparent;
  color: var(--color-text);
  font-family: var(--font-caps);
  font-size: 0.8rem;
  letter-spacing: 0.24em;
  text-transform: uppercase;
}
</style>
