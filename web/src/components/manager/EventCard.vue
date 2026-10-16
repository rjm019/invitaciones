<script setup lang="ts">
import { computed, ref } from 'vue'
import type { ManagerEvent } from '@/types/design'
import GPopover from './GPopover.vue'
import ManagerIcon from './ManagerIcon.vue'

/**
 * Una invitación (o plantilla) en el inicio del gestor: portada con sus colores y su letra,
 * si se ve, si tiene cambios sin publicar, quién la publicó la última vez, cuántos
 * confirmaron y sus acciones.
 */
const props = defineProps<{ event: ManagerEvent; canDelete?: boolean }>()
const emit = defineEmits<{
  edit: []
  duplicate: []
  template: []
  use: []
  download: []
  delete: []
}>()

const menuButton = ref<HTMLElement | null>(null)
const menuOpen = ref(false)

const cover = computed(() => {
  const c = props.event.cover.colors
  const bg = c.bg ?? '#F3F1EC'
  const accent = c.accent ?? '#C8DDEE'
  return {
    background: `radial-gradient(120% 90% at 0% 0%, ${accent}66 0%, transparent 60%), radial-gradient(90% 90% at 100% 100%, ${c.primary ?? '#E2C77A'}44 0%, transparent 60%), ${bg}`,
    color: c.primary ?? '#96792C',
    fontFamily: props.event.cover.font ? `"${props.event.cover.font}", cursive` : 'cursive',
  }
})
const date = computed(() => {
  if (!props.event.starts_at) return null
  return new Intl.DateTimeFormat('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(props.event.starts_at))
})
const confirmed = computed(() => props.event.counts.attending)
const lastPublish = computed(() => {
  const last = props.event.last_publish
  if (!last?.by) return null
  const day = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short' }).format(
    new Date(last.published_at),
  )
  const created = last.origin === 'nueva' || last.origin.startsWith('copia de ')
  return `${created ? 'Creada' : 'Publicada'} por ${last.by.name} · ${day}`
})
const TYPE: Record<string, string> = {
  xv: 'XV años',
  boda: 'Boda',
  graduacion: 'Graduación',
  bautizo: 'Bautizo',
  cumple: 'Cumpleaños',
  otro: 'Evento',
}

/** La portada abre el editor; en una plantilla, crea una invitación con ella. */
function open(): void {
  if (props.event.template) emit('use')
  else emit('edit')
}

function act(action: 'duplicate' | 'template' | 'download' | 'delete'): void {
  menuOpen.value = false
  if (action === 'duplicate') emit('duplicate')
  else if (action === 'template') emit('template')
  else if (action === 'delete') emit('delete')
  else emit('download')
}
</script>

<template>
  <article class="card g-card" :class="{ 'card--template': event.template }">
    <button
      type="button"
      class="card__cover"
      :style="cover"
      :aria-label="`Editar ${event.title}`"
      @click="open"
    >
      <span class="card__type">{{
        event.template ? 'Plantilla' : (TYPE[event.type] ?? 'Evento')
      }}</span>
      <span class="card__name">{{ event.celebrant || event.title }}</span>
    </button>

    <div class="card__body">
      <div class="card__title-row">
        <h3 class="card__title">{{ event.title }}</h3>
        <button
          ref="menuButton"
          type="button"
          class="g-icon-btn"
          aria-label="Más acciones"
          @click="menuOpen = !menuOpen"
        >
          <ManagerIcon name="ellipsis" />
        </button>
      </div>
      <p class="card__meta">
        <span>/e/{{ event.slug }}</span>
        <span v-if="date"> · {{ date }}</span>
      </p>
      <p v-if="lastPublish" class="card__meta card__by">{{ lastPublish }}</p>
      <div class="card__badges">
        <span v-if="event.error" class="g-badge g-badge--danger"
          ><ManagerIcon name="triangle-exclamation" /> Con errores</span
        >
        <template v-else-if="!event.template">
          <span v-if="event.published" class="g-badge g-badge--ok"
            ><ManagerIcon name="eye" /> Visible</span
          >
          <span v-else class="g-badge"><ManagerIcon name="eye-slash" /> Oculta</span>
        </template>
        <span v-if="event.pending" class="g-badge g-badge--warn">Cambios sin publicar</span>
        <span v-if="event.format === 'legacy'" class="g-badge g-badge--accent"
          >Formato anterior</span
        >
        <span v-if="!event.template && event.counts.invitations" class="g-badge">
          <ManagerIcon name="user-group" /> {{ confirmed }} confirmados
        </span>
      </div>
      <div class="card__actions">
        <button
          v-if="event.template"
          type="button"
          class="g-btn g-btn--primary g-btn--small"
          @click="emit('use')"
        >
          <ManagerIcon name="plus" /> Usar plantilla
        </button>
        <button
          type="button"
          class="g-btn g-btn--small"
          :class="{ 'g-btn--primary': !event.template }"
          @click="emit('edit')"
        >
          <ManagerIcon name="paintbrush" /> {{ event.template ? 'Editar' : 'Editar invitación' }}
        </button>
      </div>
    </div>

    <GPopover
      :open="menuOpen"
      :anchor="menuButton"
      :width="230"
      align="end"
      @close="menuOpen = false"
    >
      <nav class="menu" aria-label="Acciones">
        <a
          v-if="!event.template"
          class="menu__item"
          :href="`/e/${event.slug}`"
          target="_blank"
          rel="noopener"
          @click="menuOpen = false"
        >
          <ManagerIcon name="arrow-up-right-from-square" /> Ver invitación
        </a>
        <a
          v-if="!event.template"
          class="menu__item"
          :href="`/panel/${event.slug}`"
          target="_blank"
          rel="noopener"
          @click="menuOpen = false"
        >
          <ManagerIcon name="user" /> Panel del cliente
        </a>
        <button type="button" class="menu__item" @click="act('duplicate')">
          <ManagerIcon name="copy" /> Duplicar
        </button>
        <button v-if="!event.template" type="button" class="menu__item" @click="act('template')">
          <ManagerIcon name="layer-group" /> Guardar como plantilla
        </button>
        <button type="button" class="menu__item" @click="act('download')">
          <ManagerIcon name="file-zipper" /> Descargar paquete
        </button>
        <button
          v-if="canDelete"
          type="button"
          class="menu__item menu__item--danger"
          @click="act('delete')"
        >
          <ManagerIcon name="trash-can" /> Eliminar plantilla
        </button>
      </nav>
    </GPopover>
  </article>
</template>

<style scoped>
.card {
  display: grid;
  grid-template-rows: auto 1fr;
  overflow: hidden;
  transition:
    transform 0.2s var(--g-ease),
    box-shadow 0.2s;
}
.card:hover {
  transform: translateY(-2px);
  box-shadow: var(--g-shadow-md);
}
.card__cover {
  position: relative;
  display: grid;
  place-items: center;
  height: 132px;
  border: 0;
  border-bottom: 1px solid var(--g-line);
  cursor: pointer;
}
.card__type {
  position: absolute;
  top: 10px;
  left: 12px;
  padding: 3px 8px;
  border-radius: 999px;
  background: rgb(255 255 255 / 0.75);
  color: #3f4658;
  font: 700 10.5px/1.2 var(--g-font);
  letter-spacing: 0.05em;
  text-transform: uppercase;
}
.card__name {
  max-width: 90%;
  overflow: hidden;
  font-size: 40px;
  line-height: 1.1;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.card__body {
  display: grid;
  align-content: start;
  gap: 8px;
  padding: 12px 14px 14px;
}
.card__title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.card__title {
  overflow: hidden;
  font-size: 15px;
  font-weight: 700;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.card__meta {
  color: var(--g-faint);
  font-size: 12.5px;
}
.card__by {
  overflow: hidden;
  margin-top: -2px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.card__badges {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}
.card__actions {
  display: flex;
  gap: 6px;
  margin-top: 4px;
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
.menu__item:hover {
  background: var(--g-surface-3);
}
.menu__item .g-icon {
  color: var(--g-muted);
}
.menu__item--danger,
.menu__item--danger .g-icon {
  color: var(--g-danger);
}
.menu__item--danger:hover {
  background: var(--g-danger-soft);
}
@media (prefers-reduced-motion: reduce) {
  .card:hover {
    transform: none;
  }
}
</style>
