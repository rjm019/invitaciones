<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { usageLabel, usageWarning } from '@/services/albumService'
import { dayMonth, shortDateTime } from '@/services/dateFormatService'
import type { PanelAlbum, PanelAlbumAction } from '@/types/panel'

/**
 * Pestaña "Álbum": las fotos que suben los invitados (pendientes) y las que el dueño ya
 * eligió. Elegir, Quitar y Rechazar (de una en una o varias a la vez); rechazar borra el
 * archivo al instante. Las miniaturas se piden con la sesión del panel (nada es público hasta
 * elegirlo). Descarga las elegidas en .zip. Al cerrar el álbum solo queda el aviso.
 */
const props = defineProps<{
  album: PanelAlbum
  timezone: string
  slug: string
  decide: (ids: string[], action: PanelAlbumAction) => Promise<void>
  photo: (id: string, kind: 'thumb' | 'photo') => Promise<Blob>
  download: () => Promise<Blob>
}>()

const view = ref<'pending' | 'chosen'>('pending')
const selected = ref<string[]>([])
const confirmReject = ref(false)
const busy = ref(false)
const error = ref('')

const closed = computed(() => props.album.state === 'closed')
const list = computed(() => props.album.photos.filter((p) => p.status === view.value))
const allSelected = computed(
  () => list.value.length > 0 && list.value.every((p) => selected.value.includes(p.id)),
)
const warning = computed(() => usageWarning(props.album.percent))
const deletesOn = computed(() => (props.album.last_day ? dayMonth(props.album.last_day) : null))

// Lo seleccionado que ya no está en esta vista (se eligió, se rechazó, cambió la pestaña) se suelta.
watch([list, view], () => {
  const ids = new Set(list.value.map((p) => p.id))
  selected.value = selected.value.filter((id) => ids.has(id))
  confirmReject.value = false
})

/** Miniaturas: id → dirección local del archivo (se piden de pocas en pocas). */
const thumbs = ref<Record<string, string>>({})
const loading = new Set<string>()
let alive = true

async function loadThumbs() {
  const pending = props.album.photos
    .map((p) => p.id)
    .filter((id) => !thumbs.value[id] && !loading.has(id))
  pending.forEach((id) => loading.add(id))
  const worker = async () => {
    for (let id = pending.shift(); id !== undefined; id = pending.shift()) {
      try {
        const url = URL.createObjectURL(await props.photo(id, 'thumb'))
        if (!alive) return URL.revokeObjectURL(url)
        thumbs.value = { ...thumbs.value, [id]: url }
      } catch {
        // Sin miniatura: queda el recuadro vacío (la foto pudo rechazarse mientras tanto).
      } finally {
        loading.delete(id)
      }
    }
  }
  await Promise.all([worker(), worker(), worker(), worker()])
}

watch(
  () => props.album.photos.map((p) => p.id).join(','),
  () => {
    const keep = new Set(props.album.photos.map((p) => p.id))
    const next: Record<string, string> = {}
    for (const [id, url] of Object.entries(thumbs.value)) {
      if (keep.has(id)) next[id] = url
      else URL.revokeObjectURL(url)
    }
    thumbs.value = next
    void loadThumbs()
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  alive = false
  Object.values(thumbs.value).forEach((url) => URL.revokeObjectURL(url))
})

function toggle(id: string) {
  selected.value = selected.value.includes(id)
    ? selected.value.filter((x) => x !== id)
    : [...selected.value, id]
}

function toggleAll() {
  selected.value = allSelected.value ? [] : list.value.map((p) => p.id)
}

async function run(ids: string[], action: PanelAlbumAction) {
  if (ids.length === 0 || busy.value) return
  error.value = ''
  busy.value = true
  try {
    await props.decide(ids, action)
    selected.value = selected.value.filter((id) => !ids.includes(id))
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'No se pudo guardar el cambio.'
  } finally {
    busy.value = false
    confirmReject.value = false
  }
}

async function save() {
  error.value = ''
  busy.value = true
  try {
    const blob = await props.download()
    const url = URL.createObjectURL(blob)
    Object.assign(document.createElement('a'), {
      href: url,
      download: `album-${props.slug}.zip`,
    }).click()
    setTimeout(() => URL.revokeObjectURL(url), 2000)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'No se pudo descargar.'
  } finally {
    busy.value = false
  }
}

async function open(id: string) {
  try {
    const url = URL.createObjectURL(await props.photo(id, 'photo'))
    window.open(url, '_blank', 'noopener')
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'No se pudo abrir la foto.'
  }
}
</script>

<template>
  <section class="p-card album" aria-labelledby="album-title">
    <div class="album__head">
      <h2 id="album-title" class="p-card__title">Álbum</h2>
      <button
        v-if="!closed && album.counts.chosen"
        type="button"
        class="p-button p-button--small"
        :disabled="busy"
        @click="save"
      >
        Descargar álbum (.zip)
      </button>
    </div>

    <p v-if="closed" class="p-hint" role="status">
      El álbum ya se borró. Las respuestas, las mesas y las dedicatorias se quedan en el panel.
    </p>
    <template v-else>
      <p class="p-hint">
        <template v-if="album.state === 'before'"
          >Los invitados podrán subir fotos desde el día del evento.
        </template>
        <template v-if="deletesOn">Se borra al terminar el {{ deletesOn }}</template>
        <template v-if="album.closes_at">
          ({{ shortDateTime(album.closes_at, timezone) }}).</template
        >
      </p>
      <div class="album__usage">
        <span
          class="album__meter"
          role="progressbar"
          aria-label="Espacio del álbum"
          aria-valuemin="0"
          aria-valuemax="100"
          :aria-valuenow="album.percent"
        >
          <span
            class="album__meter-fill"
            :class="{ 'is-warn': album.near_limit }"
            :style="{ width: `${album.percent}%` }"
          />
        </span>
        <span class="p-hint"
          >{{ usageLabel(album.used_bytes, album.max_bytes) }} ({{ album.percent }} %)</span
        >
      </div>
      <p v-if="warning" class="album__warning" role="status">{{ warning }}</p>
      <p v-if="error" class="p-error" role="alert">{{ error }}</p>

      <div class="album__tabs" role="group" aria-label="Fotos">
        <button
          type="button"
          class="album__tab"
          :aria-pressed="view === 'pending'"
          @click="view = 'pending'"
        >
          Pendientes ({{ album.counts.pending }})
        </button>
        <button
          type="button"
          class="album__tab"
          :aria-pressed="view === 'chosen'"
          @click="view = 'chosen'"
        >
          Elegidas ({{ album.counts.chosen }})
        </button>
      </div>

      <p v-if="!list.length" class="p-hint">
        {{
          view === 'pending'
            ? 'No hay fotos por revisar.'
            : 'Todavía no has elegido fotos: aparecen en la invitación al elegirlas.'
        }}
      </p>
      <template v-else>
        <div class="album__bulk">
          <label class="album__all">
            <input type="checkbox" :checked="allSelected" :disabled="busy" @change="toggleAll" />
            Seleccionar todas
          </label>
          <template v-if="selected.length">
            <span class="p-hint"
              >{{ selected.length }}
              {{ selected.length === 1 ? 'seleccionada' : 'seleccionadas' }}</span
            >
            <button
              v-if="view === 'pending'"
              type="button"
              class="p-button p-button--small"
              :disabled="busy"
              @click="run(selected, 'choose')"
            >
              Elegir
            </button>
            <button
              v-else
              type="button"
              class="p-button p-button--small p-button--ghost"
              :disabled="busy"
              @click="run(selected, 'unchoose')"
            >
              Quitar
            </button>
            <button
              v-if="!confirmReject"
              type="button"
              class="p-button p-button--small p-button--ghost"
              :disabled="busy"
              @click="confirmReject = true"
            >
              Rechazar
            </button>
            <button
              v-else
              type="button"
              class="p-button p-button--small album__danger"
              :disabled="busy"
              @click="run(selected, 'reject')"
            >
              Se borra para siempre: confirmar
            </button>
          </template>
        </div>

        <ul class="album__grid">
          <li
            v-for="p in list"
            :key="p.id"
            class="album__card"
            :class="{ 'is-selected': selected.includes(p.id) }"
          >
            <button
              type="button"
              class="album__thumb"
              :aria-label="`Ver la foto de ${p.label ?? 'invitación #' + p.invitation}`"
              @click="open(p.id)"
            >
              <img v-if="thumbs[p.id]" :src="thumbs[p.id]" alt="" loading="lazy" />
              <span v-else class="album__placeholder" aria-hidden="true" />
            </button>
            <label class="album__pick">
              <input
                type="checkbox"
                :checked="selected.includes(p.id)"
                :disabled="busy"
                @change="toggle(p.id)"
              />
              <span class="album__who">{{ p.label ?? `Invitación #${p.invitation}` }}</span>
            </label>
            <div class="p-actions">
              <button
                v-if="p.status === 'pending'"
                type="button"
                class="p-button p-button--small"
                :disabled="busy"
                @click="run([p.id], 'choose')"
              >
                Elegir
              </button>
              <button
                v-else
                type="button"
                class="p-button p-button--small p-button--ghost"
                :disabled="busy"
                @click="run([p.id], 'unchoose')"
              >
                Quitar
              </button>
              <button type="button" class="p-link" :disabled="busy" @click="run([p.id], 'reject')">
                Rechazar
              </button>
            </div>
          </li>
        </ul>
      </template>
    </template>
  </section>
</template>

<style scoped>
.album {
  max-width: 70rem;
  margin: 0 auto;
}
.album__head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
  margin-bottom: 0.4rem;
}
.album__head .p-card__title {
  margin: 0;
}
.album__usage {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.6rem;
  margin: 0.4rem 0;
}
.album__meter {
  flex: 1 1 10rem;
  height: 0.55rem;
  overflow: hidden;
  border-radius: 999px;
  background: var(--p-line);
}
.album__meter-fill {
  display: block;
  height: 100%;
  background: var(--p-accent);
}
.album__meter-fill.is-warn {
  background: var(--p-no);
}
.album__warning {
  margin: 0 0 0.6rem;
  padding: 0.6rem 0.8rem;
  border-radius: 10px;
  background: #fff4e5;
  color: #7a4b00;
}
.album__tabs {
  display: flex;
  gap: 0.4rem;
  margin: 0.6rem 0;
}
.album__tab {
  min-height: 2.5rem;
  padding: 0.3rem 1rem;
  border: 1px solid var(--p-line);
  border-radius: 999px;
  background: transparent;
  color: var(--p-muted);
  font: inherit;
  cursor: pointer;
}
.album__tab[aria-pressed='true'] {
  border-color: var(--p-accent);
  background: var(--p-accent);
  color: var(--p-on-accent);
}
.album__bulk {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.6rem;
  margin-bottom: 0.8rem;
}
.album__all {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  min-height: 2.5rem;
}
.album__danger {
  background: var(--p-no);
  border-color: var(--p-no);
}
.album__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(9.5rem, 1fr));
  gap: 0.8rem;
  margin: 0;
  padding: 0;
  list-style: none;
}
.album__card {
  display: grid;
  gap: 0.4rem;
  padding: 0.5rem;
  border: 1px solid var(--p-line);
  border-radius: 12px;
  background: var(--p-card);
}
.album__card.is-selected {
  border-color: var(--p-accent);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--p-accent) 35%, transparent);
}
.album__thumb {
  display: block;
  aspect-ratio: 1;
  padding: 0;
  overflow: hidden;
  border: 0;
  border-radius: 8px;
  background: var(--p-soft);
  cursor: zoom-in;
}
.album__thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.album__placeholder {
  display: block;
  width: 100%;
  height: 100%;
}
.album__pick {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  min-height: 2.2rem;
  font-size: 0.9rem;
}
.album__who {
  overflow-wrap: anywhere;
}
</style>
