<script setup lang="ts">
import { computed, defineAsyncComponent, ref } from 'vue'
import { useEvent } from '@/composables/useEvent'
import { useInvitation } from '@/composables/useInvitation'
import { dayMonth } from '@/services/dateFormatService'
import type { ResolvedSection } from '@/types/event'

// El formulario solo se descarga en las invitaciones personales.
const RsvpGuestForm = defineAsyncComponent(() => import('@/components/rsvp/RsvpGuestForm.vue'))

const props = defineProps<{ section: ResolvedSection }>()
const { event } = useEvent()
// Con enlace personal (/i/:token) hay pases y formulario; en /e/:slug no.
const context = useInvitation()
const invitation = computed(() => context?.invitation.value ?? null)

const title = computed(() => props.section.title ?? 'Confirmación')
const deadline = computed(() =>
  event.value.rsvp.deadline ? dayMonth(event.value.rsvp.deadline) : null,
)
const isOpen = computed(() =>
  invitation.value
    ? invitation.value.open
    : event.value.rsvp.open && event.value.rsvp.mode !== 'off',
)

// Invitación general: el botón abre WhatsApp con el número del layout (rsvp_whatsapp), si lo hay.
const whatsappUrl = computed(() => {
  const phone = (event.value.rsvp.whatsapp_number ?? '').replace(/\D/g, '')
  if (!phone) return null
  const text = `¡Hola! Quiero confirmar mi asistencia a ${event.value.title || 'la celebración'}.`
  return `https://wa.me/${phone.length === 10 ? `52${phone}` : phone}?text=${encodeURIComponent(text)}`
})

const showHint = ref(false)
</script>

<template>
  <div class="rsvp">
    <div class="rsvp__oval">
      <div class="rsvp__card" :class="{ 'rsvp__card--image': section.decor.card }">
        <img v-if="section.decor.card" :src="section.decor.card" alt="" class="rsvp__card-bg" />
        <div class="rsvp__body">
          <h2 class="rsvp__title" data-text="title">{{ title }}</h2>
          <p v-if="section.subtitle" class="rsvp__subtitle" data-text="subtitle">
            {{ section.subtitle }}
          </p>
          <p v-if="deadline && isOpen" class="rsvp__deadline" data-text="deadline">
            Antes del {{ deadline }}
          </p>

          <!-- Invitación general (sin pases): WhatsApp o la indicación de usar su enlace. -->
          <template v-if="!invitation">
            <p v-if="!isOpen" class="rsvp__closed">Confirmaciones cerradas</p>
            <a
              v-else-if="whatsappUrl"
              class="rsvp__button"
              data-text="button"
              :href="whatsappUrl"
              target="_blank"
              rel="noopener"
            >
              {{ section.button ?? '¡Confirma aquí!' }}
            </a>
            <button
              v-else
              type="button"
              class="rsvp__button"
              data-text="button"
              @click="showHint = true"
            >
              {{ section.button ?? '¡Confirma aquí!' }}
            </button>
            <p v-if="showHint" class="rsvp__hint" role="status">
              Para confirmar, abre el enlace personal que te enviamos por WhatsApp.
            </p>
          </template>
        </div>
      </div>
      <img
        v-if="section.decor.flowers"
        :src="section.decor.flowers"
        alt=""
        class="rsvp__flowers decor-float"
      />
    </div>

    <!-- Enlace personal: un campo por invitado, a la vista. -->
    <RsvpGuestForm v-if="invitation" :invitation="invitation" class="rsvp__form" />
  </div>
</template>

<style scoped>
.rsvp {
  position: relative;
  max-width: 26rem;
  margin: 0 auto;
}
.rsvp__card {
  position: relative;
  display: grid;
  place-items: center;
  text-align: center;
  border-radius: 50%;
  background: var(--color-lino, var(--color-surface));
}
.rsvp__card--image {
  aspect-ratio: 920 / 598;
  background: none;
}
.rsvp__card-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.rsvp__body {
  position: relative;
  padding: 8% 14%;
}
.rsvp__title {
  margin: 0;
  font-family: var(--t-title-font, var(--font-script));
  font-weight: 400;
  font-size: calc(clamp(2.1rem, 10.9cqi, 2.9rem) * var(--t-title-size, 1));
  line-height: 1.15;
  color: var(--t-title-color, var(--color-primary));
}
.rsvp__subtitle {
  margin: 0.5rem 0 0;
  font-family: var(--t-subtitle-font, var(--font-serif));
  font-size: calc(clamp(0.8rem, 3.7cqi, 0.95rem) * var(--t-subtitle-size, 1));
  text-transform: uppercase;
  line-height: 1.3;
  color: var(--t-subtitle-color);
}
.rsvp__deadline {
  margin: 0.6rem 0 0;
  font-family: var(--t-deadline-font, var(--font-serif));
  font-weight: 600;
  font-size: calc(clamp(0.8rem, 3.7cqi, 0.95rem) * var(--t-deadline-size, 1));
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: var(--t-deadline-color);
}
/* El óvalo y sus rosas van juntos: las rosas se acomodan contra el óvalo, no contra el formulario. */
.rsvp__oval {
  position: relative;
}
.rsvp__form {
  margin-top: var(--space-3);
}
.rsvp__button {
  display: inline-block;
  margin-top: 0.8rem;
  padding: 0.25rem 0.8rem;
  border: 0;
  border-radius: 999px;
  background: color-mix(in srgb, var(--color-primary-soft) 45%, var(--color-surface));
  color: var(--t-button-color, var(--color-primary));
  font-family: var(--t-button-font, var(--font-display));
  font-weight: 700;
  font-size: calc(clamp(1rem, 4.8cqi, 1.2rem) * var(--t-button-size, 1));
  text-decoration: underline;
  text-underline-offset: 0.15em;
  cursor: pointer;
  box-shadow: var(--shadow-button, none);
}
.rsvp__button:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 3px;
}
.rsvp__closed {
  margin-top: 0.8rem;
  font-family: var(--font-display);
  color: var(--color-primary);
}
.rsvp__hint {
  margin: 0.5rem 0 0;
  font-size: var(--text-small);
}
.rsvp__flowers {
  position: absolute;
  right: -0.5rem;
  bottom: -1.2rem;
  width: 34%;
  pointer-events: none;
}
</style>
