<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref } from 'vue'
import { useCelebration } from '@/composables/useCelebration'
import { useInvitation } from '@/composables/useInvitation'
import { ApiError } from '@/services/http'
import {
  MAX_TRIVIA_NAME,
  allAnswered,
  formatSeconds,
  playableQuestions,
  toTriviaPayload,
  triviaErrorMessage,
  triviaMode,
  triviaNameError,
  triviaProgress,
  triviaScore,
} from '@/services/triviaService'
import type { ResolvedSection } from '@/types/event'

/**
 * Trivia: una pregunta por pantalla, con barra de avance. Pide el nombre, abre la trivia
 * en el servidor (que mide el tiempo) y, al terminar, muestra "7 de 10" sin revelar las
 * respuestas correctas (el navegador nunca las tiene). Una participación por invitación.
 * En la invitación general (/e/:slug) se ve igual, pero pide abrir el enlace personal.
 */
const props = defineProps<{ section: ResolvedSection }>()
const context = useInvitation()
const celebration = useCelebration()

const title = computed(() => props.section.title ?? 'Trivia')
const text = computed(() => props.section.text ?? '¿Qué tanto conoces a la festejada? Responde y descúbrelo.')
const button = computed(() => props.section.button ?? 'Empezar')
const questions = computed(() => playableQuestions(props.section.questions))

const mode = computed(() =>
  triviaMode(context?.invitation.value?.trivia, props.section.closes_at, Date.now()),
)
const result = computed(() => context?.invitation.value?.trivia?.result ?? null)
const closedMessage = computed(
  () => context?.invitation.value?.trivia?.closed_message ?? 'La trivia ya cerró.',
)

const root = ref<HTMLElement | null>(null)
const name = ref('')
const started = ref(false)
const index = ref(0)
const answers = ref<(number | null)[]>([])
const nameError = ref('')
const formError = ref('')
const busy = ref(false)
const hint = ref(false)
const sending = computed(() => busy.value || (context?.sending.value ?? false))

const current = computed(() => questions.value[index.value])
const isLast = computed(() => index.value === questions.value.length - 1)
const picked = computed(() => answers.value[index.value] ?? null)
const progress = computed(() =>
  triviaProgress(index.value, questions.value.length, picked.value !== null),
)

// Una respuesta que llega con la sección ya desmontada no toca nada.
let alive = true
onBeforeUnmount(() => {
  alive = false
})

async function focusQuestion() {
  await nextTick()
  root.value?.querySelector<HTMLElement>('[data-trivia-focus]')?.focus()
}

async function begin() {
  formError.value = ''
  nameError.value = triviaNameError(name.value)
  if (nameError.value) return
  if (!context) {
    hint.value = true
    return
  }
  busy.value = true
  try {
    await context.startTrivia()
    if (!alive) return
    answers.value = questions.value.map(() => null)
    index.value = 0
    started.value = true
    focusQuestion()
  } catch (e) {
    formError.value = e instanceof Error ? e.message : 'Algo salió mal. Inténtalo de nuevo.'
  } finally {
    if (alive) busy.value = false
  }
}

function pick(option: number) {
  answers.value = answers.value.map((a, i) => (i === index.value ? option : a))
}

async function next() {
  if (picked.value === null) return
  if (!isLast.value) {
    index.value += 1
    focusQuestion()
    return
  }
  await finish()
}

async function finish() {
  formError.value = ''
  if (!context || !allAnswered(answers.value, questions.value)) return
  busy.value = true
  try {
    await context.answerTrivia(toTriviaPayload(name.value, answers.value))
    if (alive) celebration?.celebrate()
  } catch (e) {
    if (!alive) return
    formError.value =
      (e instanceof ApiError ? triviaErrorMessage(e.errors) : '') ||
      (e instanceof Error ? e.message : 'Algo salió mal. Inténtalo de nuevo.')
    // Ya respondió o ya cerró: el servidor manda; no tiene caso seguir con las preguntas.
    if (e instanceof ApiError && e.status === 409) started.value = false
  } finally {
    if (alive) busy.value = false
  }
}
</script>

<template>
  <div ref="root" class="trivia">
    <img v-if="section.decor.divider" :src="section.decor.divider" alt="" class="trivia__divider" />
    <h2 class="trivia__title" data-text="title">{{ title }}</h2>

    <!-- Ya respondida: su resultado, fijo. -->
    <div v-if="mode === 'done' && result" class="trivia__panel">
      <p class="trivia__label">Tu resultado</p>
      <p class="trivia__score" data-text="result" role="status">{{ triviaScore(result) }}</p>
      <p class="trivia__note">
        {{ result.name }} · {{ formatSeconds(result.seconds) }}
      </p>
      <p class="trivia__note">¡Gracias por participar! Los resultados se conocen en la fiesta.</p>
    </div>

    <!-- Cerrada sin haber participado. -->
    <div v-else-if="mode === 'closed'" class="trivia__panel">
      <p class="trivia__text" data-text="text" role="status">{{ closedMessage }}</p>
    </div>

    <!-- Una pregunta por pantalla. -->
    <div v-else-if="started && current" class="trivia__panel">
      <div
        class="trivia__bar"
        role="progressbar"
        aria-label="Avance de la trivia"
        aria-valuemin="0"
        aria-valuemax="100"
        :aria-valuenow="progress"
      >
        <span class="trivia__bar-fill" :style="{ transform: `scaleX(${progress / 100})` }" />
      </div>
      <p class="trivia__step">Pregunta {{ index + 1 }} de {{ questions.length }}</p>

      <div :key="index" class="trivia__question">
        <h3 class="trivia__prompt" data-text="question" tabindex="-1" data-trivia-focus>
          {{ current.text }}
        </h3>
        <div class="trivia__options" role="group" :aria-label="current.text">
          <button
            v-for="(option, i) in current.options"
            :key="i"
            type="button"
            class="trivia__option"
            data-text="option"
            :aria-pressed="picked === i + 1"
            :disabled="sending"
            @click="pick(i + 1)"
          >
            {{ option }}
          </button>
        </div>
      </div>

      <button
        type="button"
        class="trivia__submit inv-btn"
        data-text="button"
        :disabled="picked === null || sending"
        @click="next"
      >
        {{ sending ? 'Enviando…' : isLast ? 'Terminar' : 'Siguiente' }}
      </button>
      <p v-if="formError" class="trivia__error" role="alert">{{ formError }}</p>
    </div>

    <!-- Presentación: el nombre y empezar. -->
    <form v-else class="trivia__panel" novalidate @submit.prevent="begin">
      <p v-if="text" class="trivia__text" data-text="text">{{ text }}</p>
      <input
        v-model="name"
        type="text"
        class="trivia__field"
        placeholder="Tu nombre"
        aria-label="Tu nombre"
        autocomplete="name"
        :maxlength="MAX_TRIVIA_NAME"
        :aria-invalid="!!nameError"
        :disabled="sending"
        @input="nameError = ''"
      />
      <p v-if="nameError" class="trivia__error">{{ nameError }}</p>
      <button type="submit" class="trivia__submit inv-btn" data-text="button" :disabled="sending">
        {{ sending ? 'Abriendo…' : button }}
      </button>
      <p class="trivia__note">
        {{ questions.length }} {{ questions.length === 1 ? 'pregunta' : 'preguntas' }}. Se responde
        una vez por invitación y se cuenta el tiempo.
      </p>
      <p v-if="formError" class="trivia__error" role="alert">{{ formError }}</p>
      <p v-if="hint" class="trivia__note" role="status">
        Para participar, abre el enlace personal que te enviamos por WhatsApp.
      </p>
    </form>
  </div>
</template>

<style scoped>
.trivia {
  display: grid;
  justify-items: center;
  max-width: 28rem;
  margin: 0 auto;
  text-align: center;
}
.trivia__divider {
  width: min(55%, 12rem);
  margin-bottom: var(--space-2);
}
.trivia__title {
  margin: 0;
  font-family: var(--t-title-font, var(--font-caps));
  font-weight: 400;
  font-size: calc(clamp(1.7rem, 8.5cqi, 2.3rem) * var(--t-title-size, 1));
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--t-title-color, var(--color-text));
}
.trivia__panel {
  display: grid;
  gap: 0.8rem;
  width: 100%;
  margin: var(--space-3) 0 0;
}
.trivia__text {
  margin: 0;
  font-family: var(--t-text-font, var(--font-serif));
  font-style: italic;
  font-size: calc(var(--text-body) * var(--t-text-size, 1));
  line-height: 1.35;
  color: var(--t-text-color, var(--color-primary));
}
.trivia__field {
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
.trivia__field::placeholder {
  color: color-mix(in srgb, var(--color-text) 55%, transparent);
}
.trivia__field:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 1px;
}
.trivia__field[aria-invalid='true'] {
  border-color: var(--color-error);
}

/* Barra de avance: solo transform. */
.trivia__bar {
  height: 0.4rem;
  overflow: hidden;
  border-radius: 999px;
  background: color-mix(in srgb, var(--color-text) 18%, transparent);
}
.trivia__bar-fill {
  display: block;
  height: 100%;
  background: var(--color-primary);
  transform-origin: left center;
  transition: transform calc(0.4s * var(--motion-scale, 1)) ease;
}
.trivia__step {
  margin: 0;
  font-family: var(--font-caps);
  font-size: var(--text-small);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--color-text) 75%, transparent);
}
.trivia__question {
  display: grid;
  gap: 0.8rem;
  animation: trivia-in calc(0.4s * var(--motion-scale, 1)) ease both;
}
@keyframes trivia-in {
  from {
    opacity: 0;
    transform: translateY(0.6rem);
  }
}
.trivia__prompt {
  margin: 0;
  font-family: var(--t-question-font, var(--font-serif));
  font-weight: 700;
  font-size: calc(clamp(1.2rem, 6cqi, 1.5rem) * var(--t-question-size, 1));
  line-height: 1.25;
  color: var(--t-question-color, var(--color-text));
}
.trivia__prompt:focus-visible {
  outline: none;
}
.trivia__options {
  display: grid;
  gap: 0.6rem;
}
.trivia__option {
  min-height: 3rem;
  padding: 0.6rem 0.9rem;
  border: 1px solid color-mix(in srgb, var(--color-text) 45%, transparent);
  border-radius: 6px;
  background: var(--color-surface);
  color: var(--t-option-color, var(--color-text));
  font-family: var(--t-option-font, var(--font-serif));
  font-size: calc(1.1rem * var(--t-option-size, 1));
  text-align: left;
  cursor: pointer;
  transition:
    transform calc(0.2s * var(--motion-scale, 1)) ease,
    opacity calc(0.2s * var(--motion-scale, 1)) ease;
}
.trivia__option[aria-pressed='true'] {
  border: 2px solid var(--color-primary);
  font-weight: 700;
  transform: scale(1.02);
}
.trivia__option:disabled {
  opacity: 0.6;
  cursor: progress;
}
.trivia__option:focus-visible,
.trivia__submit:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 3px;
}
.trivia__submit {
  min-height: 3.2rem;
  margin-top: 0.3rem;
  border: var(--btn-border, 0);
  border-radius: var(--btn-radius, 6px);
  background: var(--btn-bg, var(--button-gradient));
  color: var(--t-button-color, var(--btn-color, var(--color-surface)));
  font-family: var(--t-button-font, var(--font-display));
  font-weight: 700;
  font-size: calc(1.15rem * var(--t-button-size, 1));
  letter-spacing: var(--btn-tracking, 0.04em);
  box-shadow: var(--btn-shadow, var(--shadow-button, none));
  cursor: pointer;
  text-transform: var(--btn-case, none);
  clip-path: var(--btn-clip, none);
  text-shadow: var(--btn-glow, none);
}
.trivia__submit:disabled {
  opacity: 0.6;
  cursor: progress;
}
.trivia__label {
  margin: 0;
  font-family: var(--font-caps);
  font-size: var(--text-small);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.trivia__score {
  margin: 0;
  font-family: var(--t-result-font, var(--font-display));
  font-size: calc(clamp(2.6rem, 14cqi, 3.6rem) * var(--t-result-size, 1));
  color: var(--t-result-color, var(--color-primary));
}
.trivia__note {
  margin: 0;
  font-size: 0.9rem;
  color: color-mix(in srgb, var(--color-text) 75%, transparent);
}
.trivia__error {
  margin: 0;
  color: var(--color-error);
  font-size: 0.95rem;
}

@media (prefers-reduced-motion: reduce) {
  .trivia__bar-fill,
  .trivia__option {
    transition: none;
  }
  .trivia__question {
    animation: none;
  }
  .trivia__option[aria-pressed='true'] {
    transform: none;
  }
}
</style>
