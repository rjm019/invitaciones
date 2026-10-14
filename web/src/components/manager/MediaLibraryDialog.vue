<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useMediaLibrary } from '@/composables/useMediaLibrary'
import { useManagerSession } from '@/composables/useManagerSession'
import { useToasts } from '@/composables/useToasts'
import { ApiError } from '@/services/http'
import type { MediaRequest } from '@/composables/useEditorContext'
import GDialog from './GDialog.vue'
import ManagerIcon from './ManagerIcon.vue'

/**
 * La biblioteca de imágenes y audio de la invitación: elegir un archivo, subir uno nuevo
 * (arrastrando o eligiéndolo; una foto grande se reduce sola) y borrar lo que no se usa.
 */
const props = defineProps<{ open: boolean; slug: string; request: MediaRequest | null }>()
const emit = defineEmits<{ close: []; pick: [name: string] }>()
const { withSession } = useManagerSession()
const { toast } = useToasts()
const library = useMediaLibrary(props.slug, withSession)

const filter = ref<'image' | 'audio'>('image')
const trim = ref(false)
const dragging = ref(false)
const input = ref<HTMLInputElement | null>(null)
const selected = ref<string | null>(null)

watch(
  () => props.open,
  (open) => {
    if (!open) return
    filter.value = props.request?.kind ?? 'image'
    selected.value = props.request?.current ?? null
    trim.value = false
    void library.refresh()
  },
)

const shown = computed(() => library.files.value.filter((f) => f.kind === filter.value))
const usedMb = computed(() => (library.totalBytes.value / 1024 / 1024).toFixed(1))
const accept = computed(() =>
  filter.value === 'audio'
    ? 'audio/mpeg,audio/mp4,audio/x-m4a,.mp3,.m4a'
    : 'image/jpeg,image/png,image/webp,image/gif,image/heic,.heic',
)

async function upload(files: FileList | File[] | null): Promise<void> {
  for (const file of [...(files ?? [])]) {
    try {
      const stored = await library.upload(file, {
        purpose: props.request?.purpose,
        trim: trim.value,
      })
      selected.value = stored.name
      filter.value = stored.kind
    } catch (e) {
      toast(e instanceof Error ? e.message : 'No se pudo subir.', 'error')
    }
  }
}
function onDrop(e: DragEvent): void {
  dragging.value = false
  void upload(e.dataTransfer?.files ?? null)
}
async function remove(name: string): Promise<void> {
  try {
    await library.remove(name)
    if (selected.value === name) selected.value = null
    toast('Archivo borrado')
  } catch (e) {
    const used =
      e instanceof ApiError
        ? ((e.data as { used_in?: { block: string; field: string }[] } | null)?.used_in ?? [])
        : []
    toast(
      used.length
        ? `Se usa en: ${used.map((u) => `${u.block} → ${u.field}`).join(', ')}. Primero cámbialo.`
        : e instanceof Error
          ? e.message
          : 'No se pudo borrar.',
      'error',
      undefined,
      7000,
    )
  }
}
function choose(): void {
  if (selected.value) {
    emit('pick', selected.value)
    emit('close')
  }
}
const size = (bytes: number) =>
  bytes > 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`
</script>

<template>
  <GDialog :open="open" title="Imágenes y audio" size="xl" @close="emit('close')">
    <div class="library">
      <div class="library__bar">
        <div class="g-segmented" role="tablist">
          <button
            type="button"
            role="tab"
            :aria-selected="filter === 'image'"
            :aria-pressed="filter === 'image'"
            @click="filter = 'image'"
          >
            <ManagerIcon name="image" /> Imágenes
          </button>
          <button
            type="button"
            role="tab"
            :aria-selected="filter === 'audio'"
            :aria-pressed="filter === 'audio'"
            @click="filter = 'audio'"
          >
            <ManagerIcon name="music" /> Canciones
          </button>
        </div>
        <span class="library__space">{{ usedMb }} MB usados</span>
      </div>

      <div
        class="drop"
        :class="{ 'is-over': dragging }"
        @dragover.prevent="dragging = true"
        @dragleave="dragging = false"
        @drop.prevent="onDrop"
      >
        <ManagerIcon name="upload" />
        <p>
          <strong>Arrastra aquí tus archivos</strong> o
          <button type="button" class="drop__link" @click="input?.click()">elígelos</button>
        </p>
        <small>{{
          filter === 'audio'
            ? 'MP3 o M4A, ideal de 3 MB o menos.'
            : 'JPG, PNG, WebP o GIF. Las fotos grandes se reducen solas.'
        }}</small>
        <label v-if="filter === 'image' && request?.trim" class="drop__trim">
          <input v-model="trim" type="checkbox" /> Recortar el aire transparente (para adornos de
          Canva)
        </label>
        <input
          ref="input"
          type="file"
          :accept="accept"
          multiple
          hidden
          @change="upload(($event.target as HTMLInputElement).files)"
        />
      </div>

      <ul v-if="library.uploads.value.length" class="uploads">
        <li v-for="u in library.uploads.value" :key="u.id" :class="{ 'has-error': u.error }">
          <span class="uploads__name">{{ u.name }}</span>
          <span v-if="u.error" class="g-error">{{ u.error }}</span>
          <span v-else class="uploads__bar"
            ><i :style="{ transform: `scaleX(${u.progress})` }"
          /></span>
          <button
            v-if="u.error"
            type="button"
            class="g-icon-btn"
            aria-label="Quitar aviso"
            @click="library.dismissUpload(u.id)"
          >
            <ManagerIcon name="xmark" />
          </button>
        </li>
      </ul>

      <p v-if="library.error.value" class="g-note g-note--danger">{{ library.error.value }}</p>

      <div
        v-if="shown.length"
        class="grid"
        role="listbox"
        :aria-label="filter === 'audio' ? 'Canciones' : 'Imágenes'"
      >
        <div
          v-for="f in shown"
          :key="f.name"
          class="file"
          :class="{ 'is-selected': selected === f.name }"
          role="option"
          :aria-selected="selected === f.name"
          tabindex="0"
          @click="selected = f.name"
          @dblclick="((selected = f.name), choose())"
          @keydown.enter="((selected = f.name), choose())"
        >
          <div class="file__thumb">
            <img v-if="f.kind === 'image'" :src="f.url" alt="" loading="lazy" />
            <ManagerIcon v-else name="music" />
          </div>
          <div class="file__info">
            <span class="file__name" :title="f.name">{{ f.name }}</span>
            <span class="file__meta">
              {{ size(f.bytes) }}<template v-if="f.width"> · {{ f.width }}×{{ f.height }}</template>
              <span v-if="f.used_in.length" class="g-badge g-badge--ok">en uso</span>
            </span>
          </div>
          <audio
            v-if="f.kind === 'audio'"
            class="file__audio"
            :src="f.url"
            controls
            preload="none"
            @click.stop
          />
          <button
            type="button"
            class="g-icon-btn file__delete"
            :aria-label="`Borrar ${f.name}`"
            :disabled="f.used_in.length > 0"
            :title="f.used_in.length ? 'Se usa en la invitación' : 'Borrar'"
            @click.stop="remove(f.name)"
          >
            <ManagerIcon name="trash-can" />
          </button>
        </div>
      </div>
      <div v-else-if="!library.loading.value" class="g-empty">
        <ManagerIcon :name="filter === 'audio' ? 'music' : 'image'" />
        <span>{{ filter === 'audio' ? 'Aún no hay canciones.' : 'Aún no hay imágenes.' }}</span>
      </div>
    </div>

    <template #footer>
      <button type="button" class="g-btn" @click="emit('close')">Cancelar</button>
      <button type="button" class="g-btn g-btn--primary" :disabled="!selected" @click="choose">
        <ManagerIcon name="check" /> Usar {{ filter === 'audio' ? 'esta canción' : 'esta imagen' }}
      </button>
    </template>
  </GDialog>
</template>

<style scoped>
.library {
  display: grid;
  gap: 14px;
}
.library__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.library__space {
  color: var(--g-faint);
  font-size: 12.5px;
}
.drop {
  display: grid;
  justify-items: center;
  gap: 6px;
  padding: 22px 16px;
  border: 2px dashed var(--g-line-strong);
  border-radius: 14px;
  background: var(--g-surface-2);
  color: var(--g-muted);
  text-align: center;
  transition:
    border-color 0.15s,
    background-color 0.15s;
}
.drop.is-over {
  border-color: var(--g-accent);
  background: var(--g-accent-soft);
}
.drop > .g-icon {
  font-size: 22px;
  color: var(--g-accent);
}
.drop small {
  color: var(--g-faint);
}
.drop__link {
  padding: 0;
  border: 0;
  background: none;
  color: var(--g-accent);
  font: inherit;
  font-weight: 600;
  text-decoration: underline;
  cursor: pointer;
}
.drop__trim {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
  font-size: 12.5px;
}
.uploads {
  display: grid;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.uploads li {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12.5px;
}
.uploads__name {
  width: 200px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.uploads__bar {
  flex: 1;
  height: 6px;
  overflow: hidden;
  border-radius: 999px;
  background: var(--g-surface-3);
}
.uploads__bar i {
  display: block;
  height: 100%;
  background: var(--g-accent);
  transform-origin: left;
  transition: transform 0.2s;
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 10px;
}
.file {
  position: relative;
  display: grid;
  gap: 6px;
  padding: 6px;
  border: 2px solid transparent;
  border-radius: 12px;
  background: var(--g-surface);
  box-shadow: 0 0 0 1px var(--g-line);
  cursor: pointer;
}
.file.is-selected {
  border-color: var(--g-accent);
  box-shadow: 0 0 0 3px var(--g-accent-soft);
}
.file__thumb {
  display: grid;
  place-items: center;
  height: 110px;
  overflow: hidden;
  border-radius: 8px;
  background: repeating-conic-gradient(#f1f2f5 0% 25%, #fff 0% 50%) 50% / 14px 14px;
  color: var(--g-faint);
  font-size: 24px;
}
.file__thumb img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.file__info {
  display: grid;
  gap: 2px;
  min-width: 0;
  padding: 0 2px;
}
.file__name {
  overflow: hidden;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 11.5px;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.file__meta {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--g-faint);
  font-size: 11px;
}
.file__audio {
  width: 100%;
  height: 32px;
}
.file__delete {
  position: absolute;
  top: 10px;
  right: 10px;
  background: rgb(255 255 255 / 0.9);
}
</style>
