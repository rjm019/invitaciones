<script setup lang="ts">
import { computed } from 'vue'
import { useEditor } from '@/composables/useEditorContext'
import ManagerIcon from './ManagerIcon.vue'

/** La canción (MP3 o M4A): se escucha aquí mismo y se cambia desde la biblioteca. */
const props = defineProps<{ modelValue: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const { pickMedia, resolveAsset } = useEditor()
const url = computed(() => resolveAsset.value(props.modelValue))

async function choose(): Promise<void> {
  const file = await pickMedia({ kind: 'audio', current: props.modelValue || null })
  if (file) emit('update:modelValue', file)
}
</script>

<template>
  <div class="audio-field">
    <div class="audio-field__head">
      <span class="audio-field__icon"><ManagerIcon name="music" /></span>
      <span class="audio-field__name" :class="{ 'is-muted': !modelValue }">{{
        modelValue || 'Sin canción'
      }}</span>
      <button type="button" class="g-btn g-btn--small" @click="choose">
        <ManagerIcon :name="modelValue ? 'rotate' : 'upload'" />
        {{ modelValue ? 'Cambiar' : 'Elegir' }}
      </button>
      <button
        v-if="modelValue"
        type="button"
        class="g-icon-btn"
        aria-label="Quitar la canción"
        @click="emit('update:modelValue', '')"
      >
        <ManagerIcon name="xmark" />
      </button>
    </div>
    <audio v-if="url" class="audio-field__player" :src="url" controls preload="none" />
  </div>
</template>

<style scoped>
.audio-field {
  display: grid;
  gap: 8px;
}
.audio-field__head {
  display: flex;
  align-items: center;
  gap: 8px;
}
.audio-field__icon {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  flex: none;
  border-radius: 9px;
  background: var(--g-accent-soft);
  color: var(--g-accent);
}
.audio-field__name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.audio-field__name.is-muted {
  color: var(--g-faint);
  font-family: var(--g-font);
}
.audio-field__player {
  width: 100%;
  height: 36px;
}
</style>
