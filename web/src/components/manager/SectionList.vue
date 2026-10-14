<script setup lang="ts">
import { computed, ref } from 'vue'
import { useDragSort } from '@/composables/useDragSort'
import { useEditor, type Selection } from '@/composables/useEditorContext'
import {
  catalogSection,
  isVisible,
  moveSection,
  sectionLabel,
  toggleSection,
} from '@/services/designService'
import ManagerIcon from './ManagerIcon.vue'

/**
 * La columna izquierda del editor: "Estilo", "Datos generales" y las secciones en su orden.
 * Se arrastran para reordenarlas (o Alt + flechas), el ojo las oculta y cada una avisa si
 * no se ve o si tiene algo que corregir.
 */
const props = defineProps<{ selection: Selection; rendered: Set<string> | null }>()
const emit = defineEmits<{ select: [selection: Selection]; add: [] }>()
const { catalog, design, issues, update } = useEditor()

const listEl = ref<HTMLElement | null>(null)
const sort = useDragSort(listEl, (from, to) => update(moveSection(design.value, from, to)))

const rows = computed(() =>
  design.value.sections.map((s) => {
    const def = catalogSection(catalog.value, s.id)
    const visible = isVisible(s)
    return {
      id: s.id,
      label: sectionLabel(catalog.value, s.id),
      icon: def?.icon ?? 'layer-group',
      visible,
      // Visible pero la vista previa no la pintó (playlist sin enlace, hospedaje sin hoteles…).
      notShown: visible && props.rendered !== null && !props.rendered.has(s.id),
      errors: issues.value.filter((i) => i.block === s.id && i.level === 'error').length,
    }
  }),
)
const generalErrors = computed(
  () => issues.value.filter((i) => i.block === 'evento' && i.level === 'error').length,
)
const styleErrors = computed(
  () =>
    issues.value.filter(
      (i) => ['colores', 'fuentes', 'textos', 'pagina'].includes(i.block) && i.level === 'error',
    ).length,
)
const isSelected = (id: string) => props.selection.kind === 'section' && props.selection.id === id
</script>

<template>
  <nav class="list" aria-label="Partes de la invitación">
    <div class="list__fixed">
      <button
        type="button"
        class="list__entry"
        :class="{ 'is-selected': selection.kind === 'style' }"
        @click="emit('select', { kind: 'style' })"
      >
        <span class="list__icon list__icon--style"><ManagerIcon name="palette" /></span>
        <span class="list__label">Estilo</span>
        <span v-if="styleErrors" class="list__error" :title="`${styleErrors} por corregir`">{{
          styleErrors
        }}</span>
      </button>
      <button
        type="button"
        class="list__entry"
        :class="{ 'is-selected': selection.kind === 'general' }"
        @click="emit('select', { kind: 'general' })"
      >
        <span class="list__icon"><ManagerIcon name="sliders" /></span>
        <span class="list__label">Datos generales</span>
        <span v-if="generalErrors" class="list__error" :title="`${generalErrors} por corregir`">{{
          generalErrors
        }}</span>
      </button>
    </div>

    <div class="list__head">
      <span>Secciones</span>
      <button type="button" class="g-btn g-btn--small" @click="emit('add')">
        <ManagerIcon name="plus" /> Agregar
      </button>
    </div>

    <ol ref="listEl" class="list__sections">
      <li
        v-for="(row, i) in rows"
        :key="row.id"
        class="row"
        :class="{
          'is-selected': isSelected(row.id),
          'is-hidden': !row.visible,
          'is-dragging': sort.dragging.value === i,
        }"
        :data-sort-index="i"
        :style="
          sort.dragging.value === i
            ? { transform: `translateY(${sort.offset.value}px)` }
            : undefined
        "
      >
        <div
          v-if="
            sort.target.value === i && sort.dragging.value !== null && sort.dragging.value !== i
          "
          class="list__drop"
        />
        <button
          type="button"
          class="row__grip"
          :aria-label="`Mover ${row.label} (arrastra o Alt + flechas)`"
          @pointerdown="sort.start($event, i)"
          @keydown="sort.keydown($event, i, rows.length)"
        >
          <ManagerIcon name="grip-vertical" />
        </button>
        <button
          type="button"
          class="row__main"
          :aria-current="isSelected(row.id) ? 'true' : undefined"
          @click="emit('select', { kind: 'section', id: row.id, tab: 'content' })"
        >
          <span class="list__icon"><ManagerIcon :name="row.icon" /></span>
          <span class="list__label">{{ row.label }}</span>
          <span v-if="row.errors" class="list__error" :title="`${row.errors} por corregir`">{{
            row.errors
          }}</span>
          <span v-else-if="row.notShown" class="row__warn" title="No se ve todavía"
            ><ManagerIcon name="triangle-exclamation"
          /></span>
        </button>
        <button
          type="button"
          class="g-icon-btn row__eye"
          :aria-label="row.visible ? `Ocultar ${row.label}` : `Mostrar ${row.label}`"
          :title="row.visible ? 'Ocultar' : 'Mostrar'"
          @click="update(toggleSection(design, row.id))"
        >
          <ManagerIcon :name="row.visible ? 'eye' : 'eye-slash'" />
        </button>
      </li>
      <li
        v-if="sort.target.value === rows.length && sort.dragging.value !== null"
        class="list__drop"
      />
    </ol>
  </nav>
</template>

<style scoped>
.list {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  grid-template-rows: auto auto 1fr;
  height: 100%;
  min-height: 0;
}
.list__fixed {
  display: grid;
  gap: 2px;
  padding: 10px 8px;
  border-bottom: 1px solid var(--g-line);
}
.list__entry,
.row__main {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-height: 38px;
  padding: 0 8px;
  border: 0;
  border-radius: 9px;
  background: transparent;
  color: var(--g-text);
  font: 500 13.5px/1.2 var(--g-font);
  text-align: left;
  cursor: pointer;
}
.list__entry:hover,
.row:hover .row__main {
  background: var(--g-surface-3);
}
.list__entry.is-selected,
.row.is-selected .row__main {
  background: var(--g-accent-soft);
  color: var(--g-accent);
}
.list__icon {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  flex: none;
  border-radius: 7px;
  background: var(--g-surface-3);
  color: var(--g-muted);
  font-size: 12px;
}
.is-selected .list__icon {
  background: var(--g-surface);
  color: var(--g-accent);
}
.list__icon--style {
  background: linear-gradient(135deg, #fde68a, #f9a8d4, #a5b4fc);
  color: #3b2f63;
}
.list__label {
  flex: 1;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.list__error {
  display: grid;
  place-items: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 999px;
  background: var(--g-danger);
  color: #fff;
  font-size: 11px;
  font-weight: 700;
}
.list__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 12px 6px 16px;
  color: var(--g-faint);
  font-size: 11.5px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}
.list__sections {
  min-height: 0;
  margin: 0;
  padding: 2px 8px 24px;
  overflow: auto;
  list-style: none;
}
.list__drop {
  height: 3px;
  margin: 1px 6px;
  border-radius: 2px;
  background: var(--g-accent);
}
.row {
  position: relative;
  display: flex;
  align-items: center;
  gap: 2px;
}
.row.is-dragging {
  z-index: 2;
  border-radius: 9px;
  background: var(--g-surface);
  box-shadow: var(--g-shadow-lg);
}
.row.is-hidden .row__main {
  color: var(--g-faint);
}
.row.is-hidden .list__icon {
  opacity: 0.5;
}
.row__grip {
  display: grid;
  place-items: center;
  width: 20px;
  height: 30px;
  flex: none;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--g-line-strong);
  cursor: grab;
  touch-action: none;
}
.row:hover .row__grip {
  color: var(--g-faint);
}
.row__grip:active {
  cursor: grabbing;
}
.row__warn {
  color: var(--g-warn);
  font-size: 12px;
}
.row__eye {
  opacity: 0;
}
.row:hover .row__eye,
.row.is-hidden .row__eye,
.row__eye:focus-visible {
  opacity: 1;
}
@media (hover: none) {
  .row__eye {
    opacity: 1;
  }
}
</style>
