<script setup lang="ts">
import { computed, ref } from 'vue'
import { useDragSort } from '@/composables/useDragSort'
import { useEditor } from '@/composables/useEditorContext'
import type { CatalogList, DesignSection } from '@/types/design'
import FieldInput from './FieldInput.vue'
import ManagerIcon from './ManagerIcon.vue'

/**
 * La lista de una sección (momentos del itinerario, lugares, hoteles, familia): cada
 * elemento en una tarjeta que se abre para editarlo, se arrastra para reordenarlo y se
 * puede quitar (con "deshacer" del editor).
 */
const props = defineProps<{ section: DesignSection; list: CatalogList }>()
const { issues, addItem, removeItem, moveItem, setItem, resolveAsset } = useEditor()

const listEl = ref<HTMLElement | null>(null)
const openIndex = ref<number | null>(props.section.items.length ? null : 0)
const sort = useDragSort(listEl, (from, to) => {
  moveItem(props.section.id, from, to)
  if (openIndex.value === from) openIndex.value = to
})

const full = computed(() => props.section.items.length >= props.list.max)

/** El campo de foto de la lista (galería, hoteles…), si tiene. */
const imageKey = computed(() => props.list.fields.find((f) => f.input === 'image')?.key ?? null)
/** Miniatura de la foto del elemento, para reconocerlo con la tarjeta cerrada. */
function thumb(item: Record<string, string>): string | null {
  return imageKey.value && item[imageKey.value] ? resolveAsset.value(item[imageKey.value]) : null
}
/** "17:00 · Recepción" — lo que se ve con la tarjeta cerrada; si solo hay foto, su archivo. */
function summary(item: Record<string, string>): string {
  const parts = props.list.fields
    .filter((f) => ['text', 'time', 'lines'].includes(f.input))
    .map((f) => (item[f.key] ?? '').split('\n')[0].trim())
    .filter(Boolean)
  const file = imageKey.value ? (item[imageKey.value] ?? '').trim() : ''
  return parts.slice(0, 2).join(' · ') || file || `${props.list.item_label} sin datos`
}
function errorFor(index: number, key: string): string | null {
  return (
    issues.value
      .find(
        (i) =>
          i.block === props.section.id &&
          i.item === index + 1 &&
          i.field === key &&
          i.level === 'error',
      )
      ?.message.split(': ')
      .slice(1)
      .join(': ') ?? null
  )
}
function hasError(index: number): boolean {
  return issues.value.some(
    (i) => i.block === props.section.id && i.item === index + 1 && i.level === 'error',
  )
}
function add(): void {
  addItem(props.section.id)
  openIndex.value = props.section.items.length
}
</script>

<template>
  <div class="items">
    <div class="items__head">
      <span class="g-label">{{ list.label }}</span>
      <span class="items__count">{{ section.items.length }} de {{ list.max }}</span>
    </div>
    <p v-if="list.help" class="g-help">{{ list.help }}</p>

    <ol ref="listEl" class="items__list">
      <li
        v-for="(item, i) in section.items"
        :key="i"
        class="item"
        :class="{
          'is-open': openIndex === i,
          'is-dragging': sort.dragging.value === i,
          'has-error': hasError(i),
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
          class="items__drop"
        />
        <div class="item__head">
          <button
            type="button"
            class="item__grip"
            :aria-label="`Mover ${list.item_label} ${i + 1} (Alt + flechas)`"
            @pointerdown="sort.start($event, i)"
            @keydown="sort.keydown($event, i, section.items.length)"
          >
            <ManagerIcon name="grip-vertical" />
          </button>
          <button
            type="button"
            class="item__toggle"
            :aria-expanded="openIndex === i"
            @click="openIndex = openIndex === i ? null : i"
          >
            <span class="item__n">{{ i + 1 }}</span>
            <img v-if="thumb(item)" :src="thumb(item)!" alt="" class="item__thumb" loading="lazy" />
            <span class="item__summary">{{ summary(item) }}</span>
            <ManagerIcon v-if="hasError(i)" name="triangle-exclamation" class="item__warn" />
            <ManagerIcon :name="openIndex === i ? 'chevron-up' : 'chevron-down'" />
          </button>
          <button
            type="button"
            class="g-icon-btn"
            :aria-label="`Quitar ${list.item_label} ${i + 1}`"
            @click="removeItem(section.id, i)"
          >
            <ManagerIcon name="trash-can" />
          </button>
        </div>
        <div v-if="openIndex === i" class="item__body">
          <FieldInput
            v-for="f in list.fields"
            :key="f.key"
            :def="f"
            :model-value="item[f.key] ?? ''"
            :error="errorFor(i, f.key)"
            @update:model-value="(v) => setItem(section.id, i, f.key, v)"
          />
        </div>
      </li>
      <li
        v-if="sort.target.value === section.items.length && sort.dragging.value !== null"
        class="items__drop"
      />
    </ol>

    <button type="button" class="g-btn g-btn--small items__add" :disabled="full" @click="add">
      <ManagerIcon name="plus" />
      {{ full ? `Máximo ${list.max}` : `Agregar ${list.item_label.toLowerCase()}` }}
    </button>
  </div>
</template>

<style scoped>
.items {
  display: grid;
  gap: 8px;
}
.items__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.items__count {
  color: var(--g-faint);
  font-size: 12px;
}
.items__list {
  display: grid;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.items__drop {
  height: 3px;
  margin: -4px 0 2px;
  border-radius: 2px;
  background: var(--g-accent);
}
.item {
  position: relative;
  border: 1px solid var(--g-line);
  border-radius: 10px;
  background: var(--g-surface);
}
.item.is-open {
  border-color: var(--g-accent-line);
  box-shadow: var(--g-shadow);
}
.item.has-error {
  border-color: #f2b8b5;
}
.item.is-dragging {
  z-index: 2;
  box-shadow: var(--g-shadow-lg);
  opacity: 0.95;
}
.item__head {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 3px 4px 3px 2px;
}
.item__grip {
  display: grid;
  place-items: center;
  width: 24px;
  height: 32px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--g-faint);
  cursor: grab;
  touch-action: none;
}
.item__grip:active {
  cursor: grabbing;
}
.item__toggle {
  display: flex;
  flex: 1;
  align-items: center;
  gap: 8px;
  min-width: 0;
  min-height: 32px;
  padding: 0 6px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--g-text);
  font: inherit;
  text-align: left;
  cursor: pointer;
}
.item__n {
  display: grid;
  place-items: center;
  width: 20px;
  height: 20px;
  flex: none;
  border-radius: 6px;
  background: var(--g-surface-3);
  color: var(--g-muted);
  font-size: 11px;
  font-weight: 700;
}
.item__thumb {
  width: 28px;
  height: 28px;
  flex: none;
  border-radius: 6px;
  object-fit: cover;
  background: var(--g-surface-3);
}
.item__summary {
  flex: 1;
  overflow: hidden;
  font-size: 13px;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.item__warn {
  color: var(--g-danger);
}
.item__body {
  display: grid;
  padding: 6px 12px 14px;
  border-top: 1px solid var(--g-line);
}
.item__body :deep(.g-field) {
  margin-top: 12px;
}
.items__add {
  justify-self: start;
}
</style>
