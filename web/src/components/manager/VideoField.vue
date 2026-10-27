<script setup lang="ts">
import { computed } from 'vue'
import { useEditor } from '@/composables/useEditorContext'
import ManagerIcon from './ManagerIcon.vue'

/** El video (MP4): se ve aquí mismo y se cambia desde la biblioteca. */
const props = defineProps<{ modelValue: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const { pickMedia, resolveAsset } = useEditor()
const url = computed(() => resolveAsset.value(props.modelValue))

async function choose(): Promise<void> {
  const file = await pickMedia({ kind: 'video', current: props.modelValue || null })
  if (file) emit('update:modelValue', file)
}
</script>

<template>
  <div class="video-field">
    <div class="video-field__head">
      <span class="video-field__icon"><ManagerIcon name="play" /></span>
      <span class="video-field__name" :class="{ 'is-muted': !modelValue }">{{
        modelValue || 'Sin video'
      }}</span>
      <button type="button" class="g-btn g-btn--small" @click="choose">
        <ManagerIcon :name="modelValue ? 'rotate' : 'upload'" />
        {{ modelValue ? 'Cambiar' : 'Elegir' }}
      </button>
      <button
        v-if="modelValue"
        type="button"
        class="g-icon-btn"
        aria-label="Quitar el video"
        @click="emit('update:modelValue', '')"
      >
        <ManagerIcon name="xmark" />
      </button>
    </div>
    <video v-if="url" class="video-field__player" :src="url" controls preload="none" playsinline />
  </div>
</template>

<style scoped>
.video-field {
  display: grid;
  gap: 8px;
}
.video-field__head {
  display: flex;
  align-items: center;
  gap: 8px;
}
.video-field__icon {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  flex: none;
  border-radius: 9px;
  background: var(--g-accent-soft);
  color: var(--g-accent);
}
.video-field__name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.video-field__name.is-muted {
  color: var(--g-faint);
  font-family: var(--g-font);
}
.video-field__player {
  width: 100%;
  max-height: 180px;
}
</style>
