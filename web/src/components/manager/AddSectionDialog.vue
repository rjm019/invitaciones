<script setup lang="ts">
import { computed } from 'vue'
import { useEditor } from '@/composables/useEditorContext'
import { isVisible, sectionKind } from '@/services/designService'
import GDialog from './GDialog.vue'
import ManagerIcon from './ManagerIcon.vue'

/** Galería para agregar una sección: cada tipo con su ícono y para qué sirve. */
defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: []; add: [kind: string] }>()
const { catalog, design } = useEditor()

const options = computed(() =>
  catalog.value.sections.map((s) => {
    const existing = design.value.sections.filter((x) => sectionKind(x.id) === s.id)
    const shown = existing.some(isVisible)
    return {
      ...s,
      state: s.repeatable
        ? existing.length
          ? 'more'
          : 'new'
        : shown
          ? 'there'
          : existing.length
            ? 'hidden'
            : 'new',
    }
  }),
)
</script>

<template>
  <GDialog :open="open" title="Agregar una sección" size="lg" @close="emit('close')">
    <div class="gallery">
      <button
        v-for="o in options"
        :key="o.id"
        type="button"
        class="gallery__card"
        :disabled="o.state === 'there'"
        @click="(emit('add', o.id), emit('close'))"
      >
        <span class="gallery__icon"><ManagerIcon :name="o.icon" /></span>
        <span class="gallery__text">
          <strong>{{ o.label }}</strong>
          <small>{{ o.description }}</small>
        </span>
        <span v-if="o.state === 'there'" class="g-badge g-badge--ok gallery__state"
          ><ManagerIcon name="check" /> Ya está</span
        >
        <span v-else-if="o.state === 'hidden'" class="g-badge gallery__state"
          ><ManagerIcon name="eye" /> Mostrar</span
        >
        <span v-else-if="o.state === 'more'" class="g-badge g-badge--accent gallery__state"
          ><ManagerIcon name="plus" /> Otra</span
        >
      </button>
    </div>
  </GDialog>
</template>

<style scoped>
.gallery {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
  gap: 10px;
}
.gallery__card {
  position: relative;
  display: flex;
  gap: 12px;
  padding: 14px;
  border: 1px solid var(--g-line);
  border-radius: 12px;
  background: var(--g-surface);
  color: var(--g-text);
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition:
    border-color 0.15s,
    box-shadow 0.15s,
    transform 0.15s var(--g-ease);
}
.gallery__card:hover:not(:disabled) {
  border-color: var(--g-accent-line);
  box-shadow: var(--g-shadow-md);
  transform: translateY(-1px);
}
.gallery__card:disabled {
  background: var(--g-surface-2);
  cursor: default;
}
.gallery__icon {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  flex: none;
  border-radius: 10px;
  background: var(--g-accent-soft);
  color: var(--g-accent);
  font-size: 16px;
}
.gallery__text {
  display: grid;
  gap: 2px;
  padding-right: 54px;
}
.gallery__text small {
  color: var(--g-muted);
  font-size: 12px;
}
.gallery__state {
  position: absolute;
  top: 10px;
  right: 10px;
}
</style>
