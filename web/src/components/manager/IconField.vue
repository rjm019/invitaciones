<script setup lang="ts">
import { computed } from 'vue'
import { useEditor } from '@/composables/useEditorContext'
import ManagerIcon from './ManagerIcon.vue'

/**
 * Ícono de un momento del itinerario: uno de la lista (los mismos que pinta la invitación)
 * o una imagen propia de la biblioteca.
 */
const ICONS = [
  { name: 'door-open', label: 'Entrada' },
  { name: 'church', label: 'Misa' },
  { name: 'utensils', label: 'Comida' },
  { name: 'champagne-glasses', label: 'Brindis' },
  { name: 'music', label: 'Música' },
  { name: 'cake-candles', label: 'Pastel' },
  { name: 'crown', label: 'Corona' },
  { name: 'graduation-cap', label: 'Birrete' },
  { name: 'ring', label: 'Anillos' },
  { name: 'heart', label: 'Corazón' },
  { name: 'dove', label: 'Paloma' },
  { name: 'gift', label: 'Regalo' },
  { name: 'location-dot', label: 'Lugar' },
]

const props = defineProps<{ modelValue: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const { pickMedia, resolveAsset } = useEditor()

const isFile = computed(() => /\.[a-z0-9]+$/i.test(props.modelValue))
const fileUrl = computed(() => (isFile.value ? resolveAsset.value(props.modelValue) : null))

async function chooseImage(): Promise<void> {
  const file = await pickMedia({
    kind: 'image',
    purpose: 'adorno',
    current: isFile.value ? props.modelValue : null,
    trim: true,
  })
  if (file) emit('update:modelValue', file)
}
</script>

<template>
  <div class="icons" role="radiogroup" aria-label="Ícono">
    <button
      type="button"
      class="icons__option"
      role="radio"
      :aria-checked="!modelValue"
      title="Sin ícono"
      @click="emit('update:modelValue', '')"
    >
      <ManagerIcon name="xmark" />
    </button>
    <button
      v-for="icon in ICONS"
      :key="icon.name"
      type="button"
      class="icons__option"
      role="radio"
      :aria-checked="modelValue === icon.name"
      :title="icon.label"
      :aria-label="icon.label"
      @click="emit('update:modelValue', icon.name)"
    >
      <ManagerIcon :name="icon.name" />
    </button>
    <button
      type="button"
      class="icons__option icons__option--file"
      role="radio"
      :aria-checked="isFile"
      title="Una imagen propia"
      @click="chooseImage"
    >
      <img v-if="fileUrl" :src="fileUrl" alt="" />
      <ManagerIcon v-else name="image" />
    </button>
  </div>
</template>

<style scoped>
.icons {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}
.icons__option {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  overflow: hidden;
  border: 1px solid var(--g-line);
  border-radius: 8px;
  background: var(--g-surface);
  color: var(--g-muted);
  cursor: pointer;
}
.icons__option[aria-checked='true'] {
  border-color: var(--g-accent);
  background: var(--g-accent-soft);
  color: var(--g-accent);
}
.icons__option img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
</style>
