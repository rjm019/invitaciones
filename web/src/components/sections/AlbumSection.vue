<script setup lang="ts">
import { computed, ref } from 'vue'
import PhotoViewer from '@/components/ui/PhotoViewer.vue'
import { useAlbumUpload } from '@/composables/useAlbumUpload'
import { useEvent } from '@/composables/useEvent'
import { useInvitation } from '@/composables/useInvitation'
import {
  ALBUM_PER_INVITATION,
  BEFORE_TEXT,
  albumPhotos,
  albumView,
  albumWindow,
  clampAlbumDays,
  uploadTitle,
} from '@/services/albumService'
import { dayMonth } from '@/services/dateFormatService'
import { galleryItems, type GalleryItem } from '@/services/galleryService'
import type { ResolvedSection } from '@/types/event'

/**
 * Álbum de los invitados. Antes del día del evento solo avisa que ese día se podrá subir;
 * desde ese día cada invitación sube hasta 2 fotos (se reducen en el celular a 1600 px y
 * suben de una en una) y, del día siguiente en adelante, se ven las que el dueño eligió con el
 * visor de la galería. Las pendientes nunca llegan al navegador de nadie más. En una muestra
 * (demo) se ven fotos de ejemplo y la subida se simula sin guardar nada ni llamar al servidor.
 */
const props = defineProps<{ section: ResolvedSection }>()
const { event, resolveAsset } = useEvent()
const context = useInvitation()

const title = computed(() => props.section.title ?? 'Álbum')
const text = computed(() => props.section.text ?? 'Comparte tus mejores fotos de la fiesta.')
const button = computed(() => props.section.button ?? 'Elegir fotos')
const demo = computed(() => !!event.value.demo)

const window_ = computed(() =>
  albumWindow(event.value.starts_at, event.value.timezone, clampAlbumDays(props.section.days)),
)
/** Fotos que se "subieron" en una muestra (solo en este navegador). */
const simulated = ref<string[]>([])
const view = computed(() =>
  albumView({
    window: window_.value,
    server: context?.invitation.value?.album,
    hasInvitation: !!context,
    demo: demo.value,
    simulatedUsed: simulated.value.length,
  }),
)

const deleteOn = computed(() => {
  const last = demo.value
    ? null
    : (context?.invitation.value?.album?.last_day ?? window_.value?.lastDay)
  return last ? dayMonth(last) : null
})

const shown = computed<GalleryItem[]>(() => [
  ...galleryItems(albumPhotos(props.section.photos), resolveAsset.value),
  ...simulated.value.map((src) => ({ src, caption: '', wide: false, ratio: 1 })),
])
const opened = ref<number | null>(null)

const input = ref<HTMLInputElement | null>(null)
const { entries, busy, add } = useAlbumUpload({
  upload: async (blob, name, onProgress) => {
    if (!context) throw new Error('Abre tu enlace personal para subir fotos.')
    await context.uploadAlbumPhoto(blob, name, onProgress)
  },
  simulate: () => demo.value || context?.token === 'vista-previa',
  onSimulated: (src) => simulated.value.push(src),
})

function pick() {
  input.value?.click()
}

async function onChange(e: Event) {
  const el = e.target as HTMLInputElement
  const files = [...(el.files ?? [])]
  el.value = '' // la misma foto se puede volver a elegir
  if (files.length > 0) await add(files, view.value.remaining)
}
</script>

<template>
  <div class="album">
    <h2 class="album__title" data-text="title">{{ title }}</h2>
    <p v-if="text" class="album__text" data-text="text">{{ text }}</p>

    <p v-if="view.mode === 'before'" class="album__note" role="status">{{ BEFORE_TEXT }}</p>

    <template v-else-if="view.mode === 'upload'">
      <div v-if="context" class="album__upload">
        <p class="album__label" role="status">{{ uploadTitle(view.remaining) }}</p>
        <input
          ref="input"
          type="file"
          class="album__input"
          accept="image/*"
          multiple
          tabindex="-1"
          aria-hidden="true"
          :disabled="!view.canUpload || busy"
          @change="onChange"
        />
        <button
          v-if="view.canUpload"
          type="button"
          class="album__button inv-btn"
          data-text="button"
          :disabled="busy"
          @click="pick"
        >
          {{ busy ? 'Subiendo…' : button }}
        </button>
        <p v-if="!view.canUpload && !busy" class="album__note">
          Ya subiste tus {{ ALBUM_PER_INVITATION }} fotos. Gracias por compartirlas.
        </p>
        <ul v-if="entries.length" class="album__queue" aria-live="polite">
          <li v-for="entry in entries" :key="entry.id" class="album__entry">
            <span class="album__name">{{ entry.name }}</span>
            <span
              v-if="!entry.error"
              class="album__bar"
              role="progressbar"
              aria-valuemin="0"
              aria-valuemax="100"
              :aria-valuenow="Math.round(entry.progress * 100)"
              :aria-label="`Subiendo ${entry.name}`"
            >
              <span class="album__bar-fill" :style="{ transform: `scaleX(${entry.progress})` }" />
            </span>
            <span v-if="entry.done" class="album__ok">Lista</span>
            <span v-if="entry.error" class="album__error" role="alert">{{ entry.error }}</span>
          </li>
        </ul>
      </div>
      <p v-else class="album__note">
        Para subir tus fotos, abre el enlace personal que te enviamos por WhatsApp.
      </p>

      <p v-if="demo" class="album__note">Es una muestra: tus fotos no se guardan.</p>
      <p v-else-if="deleteOn" class="album__note">Se borra al terminar el {{ deleteOn }}.</p>

      <div v-if="view.showPhotos && shown.length" class="album__grid">
        <button
          v-for="(photo, i) in shown"
          :key="photo.src"
          type="button"
          class="album__item fx-photo"
          data-cascade
          :aria-label="`Ver foto ${i + 1}`"
          @click="opened = i"
        >
          <img
            :src="photo.src"
            :srcset="photo.srcset"
            :sizes="photo.srcset ? '(min-width: 34rem) 9rem, 33vw' : undefined"
            alt=""
            class="album__img"
            loading="lazy"
            decoding="async"
          />
        </button>
      </div>
      <PhotoViewer v-model:index="opened" :photos="shown" @close="opened = null" />
    </template>
  </div>
</template>

<style scoped>
.album {
  container-type: inline-size;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  justify-items: center;
  gap: var(--space-2);
  max-width: 34rem;
  margin: 0 auto;
  text-align: center;
}
.album__title {
  margin: 0;
  font-family: var(--t-title-font, var(--font-script));
  font-weight: 400;
  font-size: calc(clamp(2.2rem, 11.5cqi, 3.2rem) * var(--t-title-size, 1));
  line-height: 1.1;
  color: var(--t-title-color, var(--color-primary));
}
.album__text {
  margin: 0;
  font-family: var(--t-text-font, var(--font-serif));
  font-style: italic;
  font-size: calc(var(--text-body) * var(--t-text-size, 1));
  line-height: 1.35;
  color: var(--t-text-color, var(--color-text));
}
.album__upload {
  display: grid;
  justify-items: center;
  gap: 0.7rem;
  width: 100%;
}
.album__label {
  margin: 0;
  font-family: var(--font-caps);
  font-size: var(--text-small);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-text);
}
.album__input {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  opacity: 0;
}
.album__button {
  min-height: 3.2rem;
  padding: 0.6rem 1.6rem;
  border: var(--btn-border, 0);
  border-radius: var(--btn-radius, 6px);
  background: var(--btn-bg, var(--button-gradient));
  color: var(--t-button-color, var(--btn-color, var(--color-surface)));
  font-family: var(--t-button-font, var(--font-display));
  font-weight: 700;
  font-size: calc(1.15rem * var(--t-button-size, 1));
  letter-spacing: var(--btn-tracking, 0.04em);
  box-shadow: var(--btn-shadow, var(--shadow-button, none));
  cursor: pointer;
  text-transform: var(--btn-case, none);
  clip-path: var(--btn-clip, none);
  text-shadow: var(--btn-glow, none);
}
.album__button:disabled {
  opacity: 0.6;
  cursor: progress;
}
.album__button:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 3px;
}
.album__note {
  margin: 0;
  font-size: 0.95rem;
  color: color-mix(in srgb, var(--color-text) 75%, transparent);
}
.album__queue {
  display: grid;
  gap: 0.5rem;
  width: 100%;
  margin: 0;
  padding: 0;
  list-style: none;
}
.album__entry {
  display: grid;
  gap: 0.25rem;
  font-size: 0.9rem;
  text-align: left;
}
.album__name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--color-text);
}
.album__bar {
  height: 0.4rem;
  overflow: hidden;
  border-radius: 999px;
  background: color-mix(in srgb, var(--color-text) 18%, transparent);
}
.album__bar-fill {
  display: block;
  height: 100%;
  background: var(--color-primary);
  transform-origin: left center;
  transition: transform calc(0.3s * var(--motion-scale, 1)) ease;
}
.album__ok {
  color: var(--color-primary);
  font-weight: 700;
}
.album__error {
  color: var(--color-error);
}
.album__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 8.5rem), 1fr));
  gap: 0.5rem;
  width: 100%;
}
.album__item {
  display: block;
  aspect-ratio: 1;
  padding: 0;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--color-primary) 45%, transparent);
  background: var(--color-surface, transparent);
  cursor: zoom-in;
}
.album__item:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 3px;
}
.album__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

@media (prefers-reduced-motion: reduce) {
  .album__bar-fill {
    transition: none;
  }
}
</style>
