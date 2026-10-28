<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useEditor } from '@/composables/useEditorContext'
import {
  audioStartError,
  clock,
  maxAudioStart,
  readAudioDuration,
} from '@/services/audioDurationService'

/**
 * Segundo en que empieza la canción. Lee la duración del MP3 elegido para limitar el
 * valor (la canción debe durar más que el inicio) y avisa si no cabe.
 */
const props = defineProps<{ modelValue: string; id?: string; describedBy?: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const { design, resolveAsset } = useEditor()

const duration = ref<number | null>(null)
const loading = ref(false)
const file = computed(() => String(design.value.event.musica_audio ?? '').trim())

let run = 0
watch(
  file,
  async (name) => {
    const mine = ++run
    duration.value = null
    if (!name) return
    loading.value = true
    const url = resolveAsset.value(name)
    const seconds = url ? await readAudioDuration(url) : null
    if (mine !== run) return
    duration.value = seconds
    loading.value = false
  },
  { immediate: true },
)

const max = computed(() => maxAudioStart(duration.value))
const problem = computed(() => audioStartError(props.modelValue, duration.value))
const note = computed(() => {
  if (!file.value) return 'Elige primero la canción (MP3).'
  if (duration.value !== null) return `La canción dura ${clock(duration.value)}.`
  return loading.value ? 'Leyendo la duración de la canción…' : 'No se pudo leer la duración.'
})

function onInput(event: Event): void {
  const raw = (event.target as HTMLInputElement).value
  // Solo dígitos: no se aceptan negativos, decimales ni texto.
  emit('update:modelValue', raw.replace(/\D/g, ''))
}
</script>

<template>
  <div class="audio-start">
    <input
      :id="id"
      class="g-input audio-start__input"
      type="number"
      inputmode="numeric"
      min="0"
      step="1"
      :max="max"
      :value="modelValue"
      placeholder="0"
      :aria-invalid="problem ? 'true' : undefined"
      :aria-describedby="describedBy"
      @input="onInput"
    />
    <span class="audio-start__unit">segundos</span>
    <p class="g-help audio-start__note">{{ note }}</p>
    <p v-if="problem" class="g-error" role="alert">{{ problem }}</p>
  </div>
</template>

<style scoped>
.audio-start {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 8px;
}
.audio-start__input {
  width: 96px;
}
.audio-start__unit {
  color: var(--g-muted);
  font-size: 12px;
}
.audio-start__note {
  flex-basis: 100%;
  margin: 0;
}
</style>
