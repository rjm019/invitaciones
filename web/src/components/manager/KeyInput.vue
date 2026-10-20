<script setup lang="ts">
import { ref } from 'vue'
import { generatePassword, hasSpaces, stripSpaces } from '@/services/passwordService'
import ManagerIcon from './ManagerIcon.vue'

/**
 * Campo para escribir una clave nueva (la del panel o la de una cuenta): con el ojo para
 * verla y, si se pide, el botón que genera una. No deja escribir ni pegar espacios: los
 * quita y avisa. Para entrar con una clave que ya existe se usa un campo normal.
 */
const props = withDefaults(
  defineProps<{
    modelValue: string
    id: string
    label: string
    maxlength?: number
    /** Muestra el botón para generar una clave aleatoria. */
    generate?: boolean
    /** Empieza a la vista (para una clave que ya llega generada). */
    visible?: boolean
    invalid?: boolean
    describedby?: string
    autofocus?: boolean
  }>(),
  {
    maxlength: 128,
    generate: false,
    visible: false,
    invalid: false,
    describedby: undefined,
    autofocus: false,
  },
)
const emit = defineEmits<{ 'update:modelValue': [value: string]; enter: [] }>()

const show = ref(props.visible)
const stripped = ref(false)

function onKeydown(e: KeyboardEvent): void {
  if (e.key === ' ') {
    e.preventDefault()
    stripped.value = true
  } else if (e.key === 'Enter') {
    emit('enter')
  }
}

/** Lo pegado (o lo que llena el navegador) llega aquí: se quitan los espacios sin mover el cursor. */
function onInput(e: Event): void {
  const el = e.target as HTMLInputElement
  const raw = el.value
  if (hasSpaces(raw)) {
    const caret = stripSpaces(raw.slice(0, el.selectionStart ?? raw.length)).length
    el.value = stripSpaces(raw)
    el.setSelectionRange(caret, caret)
    stripped.value = true
  } else {
    stripped.value = false
  }
  emit('update:modelValue', el.value)
}

function newPassword(): void {
  stripped.value = false
  show.value = true
  emit('update:modelValue', generatePassword())
}

const noticeId = `${props.id}-sin-espacios`

/** Para un botón "Generar" de afuera: llena el campo con una clave nueva y la deja a la vista. */
defineExpose({ generate: newPassword })
</script>

<template>
  <div class="key">
    <div class="key__row">
      <input
        :id="id"
        class="g-input key__input"
        :type="show ? 'text' : 'password'"
        :value="modelValue"
        :maxlength="maxlength"
        :aria-label="label"
        :aria-invalid="invalid ? 'true' : 'false'"
        :aria-describedby="
          [describedby, stripped ? noticeId : ''].filter(Boolean).join(' ') || undefined
        "
        :autofocus="autofocus"
        autocomplete="new-password"
        autocapitalize="none"
        spellcheck="false"
        @keydown="onKeydown"
        @input="onInput"
      />
      <button
        type="button"
        class="g-icon-btn"
        :aria-label="show ? 'Ocultar la clave' : 'Ver la clave'"
        @click="show = !show"
      >
        <ManagerIcon :name="show ? 'eye-slash' : 'eye'" />
      </button>
      <button
        v-if="generate"
        type="button"
        class="g-icon-btn"
        aria-label="Generar una clave aleatoria"
        title="Generar una clave aleatoria"
        @click="newPassword"
      >
        <ManagerIcon name="wand-magic-sparkles" />
      </button>
    </div>
    <p v-if="stripped" :id="noticeId" class="g-help key__notice" role="status">
      Las claves no llevan espacios: no se agregan.
    </p>
  </div>
</template>

<style scoped>
.key__row {
  display: flex;
  gap: 4px;
}
.key__input {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}
.key__notice {
  margin-top: 4px;
}
</style>
