<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ApiError } from '@/services/http'
import { noticePreview } from '@/services/panelService'
import type { PanelDeadlineNotice } from '@/types/panel'

/**
 * Texto del aviso que salta al abrir la invitación (solo si el gestor lo encendió). {cuando} es
 * donde la invitación escribe "hoy", "mañana" o "en N días"; el servidor exige que siga ahí.
 */
const props = defineProps<{
  notice: PanelDeadlineNotice
  change: (text: string | null) => Promise<void>
}>()

const text = ref(props.notice.text)
const sending = ref(false)
const error = ref('')
const done = ref('')

// El panel se actualiza solo: si cambia desde el servidor, el formulario lo sigue.
watch(
  () => props.notice.text,
  (value) => {
    text.value = value
  },
)

const dirty = computed(() => text.value !== props.notice.text)
const custom = computed(() => props.notice.text !== props.notice.default)
const preview = computed(() => noticePreview(text.value))

async function send(value: string | null, message: string) {
  error.value = ''
  done.value = ''
  sending.value = true
  try {
    await props.change(value)
    done.value = message
  } catch (e) {
    const fields = e instanceof ApiError && !Array.isArray(e.errors) ? e.errors : {}
    error.value = fields.text?.[0] ?? (e instanceof Error ? e.message : 'No se pudo guardar.')
  } finally {
    sending.value = false
  }
}
</script>

<template>
  <form class="notice" novalidate @submit.prevent="send(text, 'Listo: el aviso quedó guardado.')">
    <label for="notice-input">Aviso al abrir la invitación</label>
    <textarea
      id="notice-input"
      v-model="text"
      rows="3"
      maxlength="160"
      :disabled="sending"
      :aria-invalid="!!error"
      aria-describedby="notice-hint"
    />
    <p id="notice-hint" class="p-hint">
      Deja <strong>{cuando}</strong> donde quieras que diga «hoy», «mañana» o «en 3 días».
    </p>
    <p class="notice__preview">Ejemplo: {{ preview }}</p>
    <div class="p-actions">
      <button type="submit" class="p-button p-button--small" :disabled="sending || !dirty">
        {{ sending ? 'Guardando…' : 'Guardar aviso' }}
      </button>
      <button
        v-if="custom"
        type="button"
        class="p-button p-button--small p-button--ghost"
        :disabled="sending"
        @click="send(null, 'Listo: volvió el aviso de siempre.')"
      >
        Usar el de siempre
      </button>
    </div>
    <p v-if="error" class="p-error" role="alert">{{ error }}</p>
    <p v-if="done" class="notice__done" role="status">{{ done }}</p>
  </form>
</template>

<style scoped>
.notice {
  display: grid;
  gap: 0.4rem;
  margin-top: 1.2rem;
  padding-top: 1rem;
  border-top: 1px solid var(--p-line);
}
.notice label {
  font-weight: 600;
}
.notice textarea {
  resize: vertical;
}
.notice .p-hint {
  margin: 0;
}
.notice__preview {
  margin: 0 0 0.3rem;
  font-style: italic;
}
.notice__done {
  margin: 0.2rem 0 0;
  color: var(--p-ok);
  font-weight: 600;
}
</style>
