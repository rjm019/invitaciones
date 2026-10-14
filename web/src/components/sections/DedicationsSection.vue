<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useCelebration } from '@/composables/useCelebration'
import { useInvitation } from '@/composables/useInvitation'
import {
  MAX_DEDICATION_MESSAGE,
  MAX_DEDICATION_NAME,
  dedicationErrors,
  toDedicationPayload,
  validateDedication,
  type DedicationErrors,
} from '@/services/dedicationService'
import { ApiError } from '@/services/http'
import type { ResolvedSection } from '@/types/event'

/**
 * Dedicatorias: cada enlace personal deja una (nombre y mensaje). Ya enviada, se ve fija
 * con el agradecimiento. En la invitación general (/e/:slug) el formulario se ve igual,
 * pero al enviar pide abrir el enlace personal (sin él no hay a quién atribuirla).
 */
const props = defineProps<{ section: ResolvedSection }>()
const context = useInvitation()
const celebration = useCelebration()
const sent = computed(() => context?.invitation.value?.dedication ?? null)

const title = computed(() => props.section.title ?? 'Dedicatoria')
const text = computed(
  () =>
    props.section.text ?? 'Escribe unos buenos deseos: los guardaremos como un tesoro de este día.',
)
const button = computed(() => props.section.button ?? 'Enviar')

const root = ref<HTMLFormElement | null>(null)
const name = ref('')
const message = ref('')
const errors = ref<DedicationErrors>({})
const formError = ref('')
const hint = ref(false)
const sending = computed(() => context?.sending.value ?? false)

// Al corregir un campo, su aviso se va.
watch(name, () => delete errors.value.name)
watch(message, () => delete errors.value.message)

async function focusFirstError() {
  await nextTick()
  root.value?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
}

async function send() {
  formError.value = ''
  const payload = toDedicationPayload(name.value, message.value)
  errors.value = validateDedication(payload)
  if (Object.keys(errors.value).length) return focusFirstError()
  if (!context) {
    hint.value = true
    return
  }
  try {
    await context.dedicate(payload)
    celebration?.celebrate()
  } catch (e) {
    errors.value = e instanceof ApiError ? dedicationErrors(e.errors) : {}
    formError.value = e instanceof Error ? e.message : 'Algo salió mal. Inténtalo de nuevo.'
    focusFirstError()
  }
}
</script>

<template>
  <div class="dedication">
    <img
      v-if="section.decor.divider"
      :src="section.decor.divider"
      alt=""
      class="dedication__divider"
    />
    <h2 class="dedication__title" data-text="title">{{ title }}</h2>
    <p v-if="text" class="dedication__text" data-text="text">{{ text }}</p>

    <!-- Ya enviada: fija, con el agradecimiento. -->
    <figure v-if="sent" class="dedication__sent">
      <blockquote class="dedication__quote" data-text="message">{{ sent.message }}</blockquote>
      <figcaption class="dedication__author" data-text="author">{{ sent.name }}</figcaption>
      <p class="dedication__thanks" role="status">¡Gracias! Tu dedicatoria quedó guardada.</p>
    </figure>

    <form v-else ref="root" class="dedication__form" novalidate @submit.prevent="send">
      <input
        v-model="name"
        type="text"
        class="dedication__field"
        placeholder="Nombre"
        aria-label="Nombre"
        autocomplete="name"
        :maxlength="MAX_DEDICATION_NAME"
        :aria-invalid="!!errors.name"
        :disabled="sending"
      />
      <p v-if="errors.name" class="dedication__error">{{ errors.name }}</p>
      <textarea
        v-model="message"
        class="dedication__field dedication__field--message"
        placeholder="Dedicatoria"
        aria-label="Dedicatoria"
        rows="4"
        :maxlength="MAX_DEDICATION_MESSAGE"
        :aria-invalid="!!errors.message"
        :disabled="sending"
      />
      <p v-if="errors.message" class="dedication__error">{{ errors.message }}</p>

      <button type="submit" class="dedication__submit" data-text="button" :disabled="sending">
        {{ sending ? 'Enviando…' : button }}
      </button>
      <p class="dedication__note">Puedes enviar una dedicatoria por invitación.</p>
      <p v-if="formError" class="dedication__error dedication__error--form" role="alert">
        {{ formError }}
      </p>
      <p v-if="hint" class="dedication__note" role="status">
        Para enviar tu dedicatoria, abre el enlace personal que te enviamos por WhatsApp.
      </p>
    </form>
  </div>
</template>

<style scoped>
.dedication {
  display: grid;
  justify-items: center;
  max-width: 28rem;
  margin: 0 auto;
  text-align: center;
}
.dedication__divider {
  width: min(55%, 12rem);
  margin-bottom: var(--space-2);
}
.dedication__title {
  margin: 0;
  font-family: var(--t-title-font, var(--font-caps));
  font-weight: 400;
  font-size: calc(clamp(1.7rem, 8.5cqi, 2.3rem) * var(--t-title-size, 1));
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--t-title-color, var(--color-text));
}
.dedication__text {
  margin: 0.8rem 0 0;
  font-family: var(--t-text-font, var(--font-serif));
  font-style: italic;
  font-size: calc(var(--text-body) * var(--t-text-size, 1));
  line-height: 1.35;
  color: var(--t-text-color, var(--color-primary));
}
.dedication__form,
.dedication__sent {
  display: grid;
  gap: 0.8rem;
  width: 100%;
  margin: var(--space-3) 0 0;
}
.dedication__field {
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
.dedication__field--message {
  min-height: 7.5rem;
  resize: vertical;
  line-height: 1.35;
}
.dedication__field::placeholder {
  color: color-mix(in srgb, var(--color-text) 55%, transparent);
}
.dedication__field:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 1px;
}
.dedication__field[aria-invalid='true'] {
  border-color: var(--color-error);
}
.dedication__submit {
  min-height: 3.2rem;
  margin-top: 0.3rem;
  border: 0;
  border-radius: 6px;
  background: var(--button-gradient);
  color: var(--t-button-color, var(--color-surface));
  font-family: var(--t-button-font, var(--font-display));
  font-weight: 700;
  font-size: calc(1.15rem * var(--t-button-size, 1));
  letter-spacing: 0.04em;
  box-shadow: var(--shadow-button, none);
  cursor: pointer;
}
.dedication__submit:disabled {
  opacity: 0.6;
  cursor: progress;
}
.dedication__submit:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 3px;
}
.dedication__note {
  margin: 0;
  font-size: 0.9rem;
  color: color-mix(in srgb, var(--color-text) 75%, transparent);
}
.dedication__error {
  margin: -0.4rem 0 0;
  color: var(--color-error);
  font-size: 0.95rem;
  text-align: left;
}
.dedication__error--form {
  margin: 0;
  text-align: center;
}
.dedication__quote {
  margin: 0;
  padding: var(--space-2) var(--space-2) 0;
  font-family: var(--t-message-font, var(--font-serif));
  font-style: italic;
  font-size: calc(var(--text-body) * var(--t-message-size, 1));
  line-height: 1.4;
  white-space: pre-line;
  overflow-wrap: anywhere;
  color: var(--t-message-color);
}
.dedication__author {
  font-family: var(--t-author-font, var(--font-script-mono));
  font-size: calc(clamp(1.5rem, 7cqi, 1.9rem) * var(--t-author-size, 1));
  color: var(--t-author-color, var(--color-primary));
}
.dedication__thanks {
  margin: 0;
  font-family: var(--font-caps);
  font-size: var(--text-small);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
</style>
