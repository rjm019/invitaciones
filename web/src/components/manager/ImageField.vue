<script setup lang="ts">
import { computed } from 'vue'
import { useEditor, type MediaRequest } from '@/composables/useEditorContext'
import ManagerIcon from './ManagerIcon.vue'

/**
 * Una imagen de la invitación: miniatura, nombre y "Cambiar" (abre la biblioteca, donde se
 * puede subir una nueva). Vacía = la del tema (`fallback`), si la hay.
 */
const props = withDefaults(
  defineProps<{
    modelValue: string
    label?: string
    purpose?: MediaRequest['purpose']
    fallback?: string | null
    trim?: boolean
    removable?: boolean
  }>(),
  { label: 'Imagen', purpose: 'foto', fallback: null, trim: false, removable: true },
)
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const { pickMedia, resolveAsset } = useEditor()

const url = computed(
  () => resolveAsset.value(props.modelValue) ?? resolveAsset.value(props.fallback),
)
const usingFallback = computed(() => !props.modelValue && !!props.fallback)

async function choose(): Promise<void> {
  const file = await pickMedia({
    kind: 'image',
    purpose: props.purpose,
    current: props.modelValue || null,
    trim: props.trim,
  })
  if (file) emit('update:modelValue', file)
}
</script>

<template>
  <div class="image-field">
    <button
      type="button"
      class="image-field__thumb"
      :aria-label="`Cambiar ${label}`"
      @click="choose"
    >
      <img v-if="url" :src="url" alt="" loading="lazy" />
      <ManagerIcon v-else name="image" />
    </button>
    <div class="image-field__info">
      <span class="image-field__name" :class="{ 'is-muted': !modelValue }">
        {{ modelValue || (usingFallback ? 'La del diseño' : 'Sin imagen') }}
      </span>
      <div class="image-field__actions">
        <button type="button" class="g-btn g-btn--small" @click="choose">
          <ManagerIcon :name="modelValue ? 'rotate' : 'upload'" />
          {{ modelValue ? 'Cambiar' : 'Elegir' }}
        </button>
        <button
          v-if="modelValue && removable"
          type="button"
          class="g-btn g-btn--ghost g-btn--small"
          @click="emit('update:modelValue', '')"
        >
          {{ fallback ? 'Usar la del diseño' : 'Quitar' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.image-field {
  display: flex;
  align-items: center;
  gap: 12px;
}
.image-field__thumb {
  display: grid;
  place-items: center;
  width: 64px;
  height: 64px;
  flex: none;
  overflow: hidden;
  border: 1px solid var(--g-line);
  border-radius: 10px;
  background: repeating-conic-gradient(#f1f2f5 0% 25%, #fff 0% 50%) 50% / 14px 14px;
  color: var(--g-faint);
  font-size: 20px;
  cursor: pointer;
}
.image-field__thumb img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.image-field__info {
  display: grid;
  gap: 6px;
  min-width: 0;
}
.image-field__name {
  overflow: hidden;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.image-field__name.is-muted {
  color: var(--g-faint);
  font-family: var(--g-font);
}
.image-field__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
</style>
