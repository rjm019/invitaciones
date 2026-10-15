<script setup lang="ts">
import { computed, ref } from 'vue'
import type { SaveStatus } from '@/composables/useDesignEditor'
import GPopover from './GPopover.vue'
import ManagerIcon from './ManagerIcon.vue'

/**
 * La barra del editor: volver, de qué invitación se trata, si ya se guardó, deshacer y
 * rehacer, verla y "Publicar" (con cuántos cambios hay sin publicar). El menú ⋯ trae el
 * historial, descargar o importar, descartar los cambios y el panel del cliente.
 */
const props = defineProps<{
  title: string
  slug: string
  status: SaveStatus
  source: 'draft' | 'live' | 'legacy'
  pending: boolean
  changes: number
  errors: number
  template: boolean
  /** Si los invitados la pueden abrir (ajustes: publicado). */
  visible: boolean
  canUndo: boolean
  canRedo: boolean
}>()
const emit = defineEmits<{
  back: []
  undo: []
  redo: []
  publish: []
  history: []
  transfer: []
  discard: []
  sections: []
}>()

const menuButton = ref<HTMLElement | null>(null)
const menuOpen = ref(false)

const STATUS: Record<SaveStatus, { icon: string; text: string; tone: string }> = {
  loading: { icon: 'spinner', text: 'Cargando…', tone: '' },
  saved: { icon: 'circle-check', text: 'Guardado', tone: 'ok' },
  dirty: { icon: 'cloud', text: 'Cambios sin guardar', tone: '' },
  saving: { icon: 'spinner', text: 'Guardando…', tone: '' },
  offline: { icon: 'wifi', text: 'Sin conexión: reintentando', tone: 'warn' },
  error: { icon: 'triangle-exclamation', text: 'No se pudo guardar', tone: 'danger' },
  conflict: { icon: 'triangle-exclamation', text: 'Alguien más la cambió', tone: 'danger' },
}
const state = computed(() => STATUS[props.status])
const sourceLabel = computed(() => {
  if (props.template) return 'Plantilla'
  if (props.source === 'legacy') return 'Formato anterior'
  if (props.pending) return 'Con cambios sin publicar'
  return props.visible ? 'Publicada' : 'Oculta para los invitados'
})
const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)
const mod = isMac ? '⌘' : 'Ctrl'

function act(event: 'history' | 'transfer' | 'discard'): void {
  menuOpen.value = false
  if (event === 'history') emit('history')
  else if (event === 'transfer') emit('transfer')
  else emit('discard')
}
</script>

<template>
  <header class="bar">
    <button
      type="button"
      class="g-icon-btn bar__menu-sections"
      aria-label="Secciones"
      @click="emit('sections')"
    >
      <ManagerIcon name="layer-group" />
    </button>
    <button
      type="button"
      class="g-icon-btn"
      aria-label="Volver a las invitaciones"
      title="Volver"
      @click="emit('back')"
    >
      <ManagerIcon name="arrow-left" />
    </button>
    <div class="bar__title">
      <h1>{{ title }}</h1>
      <p>
        <span class="bar__slug">/e/{{ slug }}</span>
        <span
          class="bar__source"
          :class="{
            'is-pending': pending || source === 'legacy',
            'is-hidden': !visible && !template,
          }"
          >{{ sourceLabel }}</span
        >
      </p>
    </div>

    <div class="bar__history">
      <button
        type="button"
        class="g-icon-btn"
        :disabled="!canUndo"
        :aria-label="`Deshacer (${mod}+Z)`"
        :title="`Deshacer (${mod}+Z)`"
        @click="emit('undo')"
      >
        <ManagerIcon name="rotate-left" />
      </button>
      <button
        type="button"
        class="g-icon-btn"
        :disabled="!canRedo"
        :aria-label="`Rehacer (${mod}+Shift+Z)`"
        :title="`Rehacer (${mod}+Shift+Z)`"
        @click="emit('redo')"
      >
        <ManagerIcon name="rotate-right" />
      </button>
    </div>

    <span class="bar__status" :class="state.tone ? `is-${state.tone}` : ''" role="status">
      <ManagerIcon :name="state.icon" :spin="status === 'saving' || status === 'loading'" />
      <span class="bar__status-text">{{ state.text }}</span>
    </span>

    <a
      v-if="!template"
      class="g-btn g-btn--ghost bar__view"
      :href="`/e/${slug}`"
      target="_blank"
      rel="noopener"
      title="Abrir la invitación publicada"
    >
      <ManagerIcon name="arrow-up-right-from-square" /> <span>Ver</span>
    </a>
    <button
      type="button"
      class="g-btn g-btn--primary bar__publish"
      :disabled="!pending || status === 'loading'"
      :title="pending ? 'Que los invitados vean los cambios' : 'No hay cambios por publicar'"
      @click="emit('publish')"
    >
      <ManagerIcon name="cloud" />
      {{ template ? 'Guardar plantilla' : 'Publicar' }}
      <span v-if="pending && changes" class="bar__count">{{ changes }}</span>
      <span v-if="errors" class="bar__errors" :title="`${errors} por corregir`">!</span>
    </button>
    <button
      ref="menuButton"
      type="button"
      class="g-icon-btn"
      aria-label="Más opciones"
      :aria-expanded="menuOpen"
      @click="menuOpen = !menuOpen"
    >
      <ManagerIcon name="ellipsis" />
    </button>

    <GPopover
      :open="menuOpen"
      :anchor="menuButton"
      :width="250"
      align="end"
      @close="menuOpen = false"
    >
      <nav class="menu" aria-label="Opciones">
        <button type="button" class="menu__item" @click="act('history')">
          <ManagerIcon name="clock-rotate-left" /> Historial de publicaciones
        </button>
        <button type="button" class="menu__item" @click="act('transfer')">
          <ManagerIcon name="download" /> Descargar o importar
        </button>
        <a
          v-if="!template"
          class="menu__item"
          :href="`/panel/${slug}`"
          target="_blank"
          rel="noopener"
          @click="menuOpen = false"
        >
          <ManagerIcon name="user" /> Panel del cliente
        </a>
        <button
          type="button"
          class="menu__item menu__item--danger"
          :disabled="source !== 'draft'"
          @click="act('discard')"
        >
          <ManagerIcon name="trash-can" /> Descartar los cambios sin publicar
        </button>
      </nav>
    </GPopover>
  </header>
</template>

<style scoped>
.bar {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 58px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--g-line);
  background: var(--g-surface);
}
.bar__menu-sections {
  display: none;
}
.bar__title {
  min-width: 0;
  margin: 0 8px 0 2px;
}
.bar__title h1 {
  overflow: hidden;
  font-size: 15px;
  font-weight: 700;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.bar__title p {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--g-faint);
  font-size: 12px;
  white-space: nowrap;
}
.bar__slug {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}
.bar__source.is-hidden {
  color: var(--g-muted);
}
.bar__source.is-pending {
  color: var(--g-warn);
  font-weight: 600;
}
.bar__history {
  display: flex;
  gap: 2px;
  padding-left: 8px;
  border-left: 1px solid var(--g-line);
}
.bar__status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;
  color: var(--g-faint);
  font-size: 12.5px;
  white-space: nowrap;
}
.bar__status.is-ok {
  color: var(--g-ok);
}
.bar__status.is-warn {
  color: var(--g-warn);
}
.bar__status.is-danger {
  color: var(--g-danger);
}
.bar__publish {
  position: relative;
}
.bar__count {
  display: grid;
  place-items: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: 999px;
  background: rgb(255 255 255 / 0.25);
  font-size: 11.5px;
}
.bar__errors {
  position: absolute;
  top: -6px;
  right: -6px;
  display: grid;
  place-items: center;
  width: 18px;
  height: 18px;
  border: 2px solid #fff;
  border-radius: 50%;
  background: var(--g-danger);
  font-size: 11px;
}
.menu {
  display: grid;
  margin: -6px;
}
.menu__item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 10px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--g-text);
  font: 500 13.5px/1.2 var(--g-font);
  text-align: left;
  text-decoration: none;
  cursor: pointer;
}
.menu__item:hover:not(:disabled) {
  background: var(--g-surface-3);
}
.menu__item:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.menu__item--danger {
  color: var(--g-danger);
}
@media (max-width: 1199px) {
  .bar__menu-sections {
    display: inline-grid;
  }
}
@media (max-width: 900px) {
  .bar__status-text,
  .bar__view span {
    display: none;
  }
}
/* En celular las secciones están en las pestañas de abajo. */
@media (max-width: 767px) {
  .bar__menu-sections {
    display: none;
  }
}
@media (max-width: 640px) {
  .bar__history,
  .bar__title p {
    display: none;
  }
}
</style>
