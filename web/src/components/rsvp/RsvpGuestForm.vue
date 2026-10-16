<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useCelebration } from '@/composables/useCelebration'
import { useInvitation } from '@/composables/useInvitation'
import { ApiError } from '@/services/http'
import {
  MAX_NAME,
  choiceLabels,
  inputErrors,
  joinNames,
  passesLabel,
  slotsOf,
  toPayload,
  validateNewGuests,
  type RsvpErrors,
} from '@/services/rsvpService'
import type { Invitation } from '@/types/invitation'

/**
 * Formulario dentro de la invitación: un campo por invitado. Los nombres ya enviados se
 * ven fijos (no se pueden cambiar) y los lugares vacíos se pueden llenar hasta la fecha
 * límite; después, quedan deshabilitados.
 */
const props = defineProps<{ invitation: Invitation }>()
const context = useInvitation()
const celebration = useCelebration()

const root = ref<HTMLFormElement | null>(null)
const names = ref<Record<number, string>>({})
const attending = ref<boolean | null>(null)
const errors = ref<RsvpErrors>({})
const formError = ref('')
const thanks = ref('')

const slots = computed(() => slotsOf(props.invitation))
const free = computed(() => slots.value.filter((s) => !s.guest))
const open = computed(() => props.invitation.open)
const sending = computed(() => context?.sending.value ?? false)
const typed = computed(() => Object.values(names.value).filter((n) => n.trim()).length)
const labels = computed(() => choiceLabels(typed.value))

// Al llegar la respuesta del servidor, los lugares ya ocupados dejan de ser editables.
watch(
  () => props.invitation.guests.length,
  () => {
    const taken = new Set(props.invitation.guests.map((g) => g.slot))
    names.value = Object.fromEntries(
      Object.entries(names.value).filter(([slot]) => !taken.has(Number(slot))),
    )
  },
)

async function focusFirstError() {
  await nextTick()
  root.value?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
}

async function send() {
  thanks.value = ''
  formError.value = ''
  errors.value = validateNewGuests(
    names.value,
    attending.value,
    props.invitation.guests.map((g) => g.full_name),
  )
  if (Object.keys(errors.value).length || !context || attending.value === null)
    return focusFirstError()

  const { payload, slots: sentFrom } = toPayload(names.value, attending.value)
  try {
    await context.submit(payload)
    const sent = payload.guests.map((g) => g.full_name)
    if (payload.attending) celebration?.celebrate()
    thanks.value = payload.attending
      ? `¡Gracias! Registramos a ${joinNames(sent)}.`
      : `Gracias por avisarnos. Lamentamos que ${sent.length > 1 ? 'no puedan' : 'no puedas'} acompañarnos.`
    names.value = {}
    attending.value = null
  } catch (e) {
    errors.value = e instanceof ApiError ? inputErrors(e.errors, sentFrom) : {}
    formError.value = e instanceof Error ? e.message : 'Algo salió mal. Inténtalo de nuevo.'
    focusFirstError()
  }
}
</script>

<template>
  <form ref="root" class="guest-form" novalidate @submit.prevent="send">
    <p v-if="invitation.label" class="guest-form__label">{{ invitation.label }}</p>
    <p class="guest-form__pass">{{ passesLabel(invitation.passes) }}.</p>

    <ol class="guest-form__slots">
      <li v-for="item in slots" :key="item.slot" class="guest-form__slot">
        <!-- Ya registrado: fijo -->
        <div v-if="item.guest" class="guest-form__locked">
          <span class="guest-form__name">{{ item.guest.full_name }}</span>
          <span class="guest-form__status" :class="{ 'is-declined': !item.guest.attending }">
            {{ item.guest.attending ? 'Asistirá' : 'No asistirá' }}
          </span>
        </div>
        <!-- Libre -->
        <template v-else>
          <input
            v-model="names[item.slot]"
            type="text"
            class="guest-form__input"
            :placeholder="invitation.passes > 1 ? `Nombre del invitado ${item.slot}` : 'Nombre'"
            :aria-label="`Nombre del invitado ${item.slot}`"
            :aria-invalid="!!errors[`guests.${item.slot}`]"
            :maxlength="MAX_NAME"
            :disabled="!open || sending"
            autocomplete="name"
          />
          <p v-if="errors[`guests.${item.slot}`]" class="guest-form__error">
            {{ errors[`guests.${item.slot}`] }}
          </p>
        </template>
      </li>
    </ol>
    <p v-if="errors.guests" class="guest-form__error">{{ errors.guests }}</p>

    <template v-if="free.length && open">
      <fieldset class="guest-form__choices" :aria-invalid="!!errors.attending">
        <legend class="visually-hidden">¿Podrás asistir?</legend>
        <label class="guest-form__choice">
          <input
            v-model="attending"
            type="radio"
            name="attending"
            :value="true"
            :disabled="sending"
          />
          <span>{{ labels.yes }}</span>
        </label>
        <label class="guest-form__choice">
          <input
            v-model="attending"
            type="radio"
            name="attending"
            :value="false"
            :disabled="sending"
          />
          <span>{{ labels.no }}</span>
        </label>
      </fieldset>
      <p v-if="errors.attending" class="guest-form__error">{{ errors.attending }}</p>

      <button type="submit" class="guest-form__submit inv-btn" :disabled="sending">
        {{ sending ? 'Enviando…' : 'Enviar' }}
      </button>
      <p class="guest-form__hint">
        Los nombres que envíes quedan registrados y ya no se pueden cambiar.
      </p>
    </template>

    <p v-if="formError" class="guest-form__error guest-form__error--form" role="alert">
      {{ formError }}
    </p>
    <p v-if="thanks" class="guest-form__thanks" role="status">{{ thanks }}</p>
    <p v-if="!open" class="guest-form__closed" role="status">
      {{ invitation.closed_message ?? 'Las confirmaciones están cerradas.' }}
    </p>
    <p v-else-if="!free.length && !thanks" class="guest-form__thanks">
      Tu invitación está completa. ¡Gracias!
    </p>
  </form>
</template>

<style scoped>
.guest-form {
  display: grid;
  gap: 0.9rem;
  padding: var(--space-4) var(--space-3) var(--space-3);
  background: var(--color-surface);
  box-shadow: var(--shadow-card);
  text-align: center;
}
.guest-form__label {
  margin: 0;
  font-family: var(--font-caps);
  font-size: clamp(1.15rem, 5.6cqi, 1.45rem);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-text);
}
.guest-form__pass {
  margin: 0;
  font-family: var(--font-serif);
  font-style: italic;
  font-size: clamp(1.05rem, 5cqi, 1.3rem);
  color: var(--color-primary);
}
.guest-form__slots {
  display: grid;
  gap: 0.7rem;
  margin: 0.4rem 0 0;
  padding: 0;
  list-style: none;
}
.guest-form__slot {
  display: grid;
  gap: 0.25rem;
}
.guest-form__input,
.guest-form__locked {
  width: 100%;
  min-height: 3rem;
  padding: 0.65rem 0.9rem;
  border: 1px solid color-mix(in srgb, var(--color-text) 55%, transparent);
  border-radius: 6px;
  background: var(--color-surface);
  color: var(--color-text);
  font-family: var(--font-serif);
  font-size: 1.1rem; /* ≥ 16 px: iOS no hace zoom al escribir */
  text-align: left;
}
.guest-form__input::placeholder {
  color: color-mix(in srgb, var(--color-text) 55%, transparent);
}
.guest-form__input:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 1px;
}
.guest-form__input[aria-invalid='true'] {
  border-color: var(--color-error);
}
.guest-form__input:disabled {
  background: color-mix(in srgb, var(--color-text) 6%, var(--color-surface));
  cursor: not-allowed;
}
/* Nombre ya registrado: se ve como el campo, pero fijo. */
.guest-form__locked {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
  border-style: dashed;
  background: color-mix(in srgb, var(--color-primary-soft) 18%, var(--color-surface));
}
.guest-form__name {
  overflow-wrap: anywhere;
}
.guest-form__status {
  flex: none;
  padding: 0.1rem 0.55rem;
  border-radius: 999px;
  background: var(--color-primary);
  color: var(--color-surface);
  font-size: 0.8rem;
  letter-spacing: 0.03em;
}
.guest-form__status.is-declined {
  background: color-mix(in srgb, var(--color-text) 45%, transparent);
}
.guest-form__choices {
  display: grid;
  justify-items: start;
  gap: 0.35rem;
  margin: 0.2rem 0 0;
  padding: 0;
  border: 0;
}
.guest-form__choice {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  min-height: 2.75rem;
  font-family: var(--font-serif);
  font-size: 1.15rem;
  color: var(--color-text);
  cursor: pointer;
}
.guest-form__choice input {
  width: 1.25rem;
  height: 1.25rem;
  margin: 0;
  accent-color: var(--color-primary);
}
.guest-form__submit {
  min-height: 3.2rem;
  margin-top: 0.4rem;
  border: var(--btn-border, 0);
  border-radius: var(--btn-radius, 6px);
  background: var(--btn-bg, var(--button-gradient));
  color: var(--btn-color, var(--color-surface));
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 1.15rem;
  letter-spacing: var(--btn-tracking, 0.04em);
  box-shadow: var(--btn-shadow, var(--shadow-button, none));
  cursor: pointer;
  text-transform: var(--btn-case, none);
  clip-path: var(--btn-clip, none);
  text-shadow: var(--btn-glow, none);
}
.guest-form__submit:disabled {
  opacity: 0.6;
  cursor: progress;
}
.guest-form__submit:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 3px;
}
.guest-form__hint {
  margin: -0.3rem 0 0;
  font-size: 0.9rem;
  color: color-mix(in srgb, var(--color-text) 75%, transparent);
}
.guest-form__error {
  margin: 0;
  color: var(--color-error);
  font-size: 0.95rem;
  text-align: left;
}
.guest-form__error--form {
  text-align: center;
}
.guest-form__thanks,
.guest-form__closed {
  margin: 0;
  font-family: var(--font-serif);
  font-size: 1.1rem;
  color: var(--color-primary);
}
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
</style>
