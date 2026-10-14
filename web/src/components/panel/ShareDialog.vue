<script setup lang="ts">
import { onMounted, ref, shallowRef } from 'vue'
import { useClipboard } from '@/composables/useClipboard'
import { useShareCard, type ShareCard } from '@/composables/useShareCard'
import { shareMessage, shareRoute } from '@/services/shareCardService'
import type { ThemeFont, ThemeManifest } from '@/themes/types'
import type { PanelBrand, PanelInvitation } from '@/types/panel'

/**
 * Enviar una invitación: la vista previa y cómo mandarla. Se manda un PDF con la imagen;
 * al tocar cualquier parte (o el QR) se abre la invitación, sin que el enlace se vea. En el
 * celular, "Enviar por WhatsApp" abre el menú de compartir; en la computadora descarga el
 * PDF y abre WhatsApp con el mensaje para adjuntarlo.
 */
const props = defineProps<{
  invitation: PanelInvitation
  brand: PanelBrand
  theme: ThemeManifest
  fonts: Record<string, ThemeFont>
}>()
const emit = defineEmits<{ close: [] }>()

const dialog = ref<HTMLDialogElement | null>(null)
const card = shallowRef<ShareCard | null>(null)
const failed = ref('')
const status = ref('')
const canShare = ref(false)
const { render, send, download } = useShareCard()
const { copied, copy } = useClipboard()

onMounted(async () => {
  dialog.value?.showModal()
  try {
    card.value = await render(props.brand, props.theme, props.fonts, props.invitation)
    canShare.value = shareRoute(navigator, card.value.pdf) === 'share'
  } catch (e) {
    failed.value = e instanceof Error ? e.message : 'No se pudo crear la imagen.'
  }
})

async function onSend() {
  if (!card.value) return
  const result = await send(card.value, props.invitation)
  status.value =
    result === 'downloaded'
      ? 'Se descargó el PDF y se abrió WhatsApp con el mensaje: adjunta el PDF en el chat.'
      : result === 'shared'
        ? '¡Listo!'
        : ''
}
</script>

<template>
  <dialog ref="dialog" class="share" aria-labelledby="share-title" @close="emit('close')">
    <div class="share__head">
      <h2 id="share-title" class="share__title">
        Invitación{{ invitation.label ? ` de ${invitation.label}` : ` #${invitation.id}` }}
      </h2>
      <button type="button" class="share__close" aria-label="Cerrar" @click="dialog?.close()">
        ×
      </button>
    </div>

    <div class="share__preview">
      <img
        v-if="card"
        :src="card.previewUrl"
        :alt="`Imagen de la invitación ${invitation.label ?? invitation.id}, con su enlace`"
      />
      <p v-else-if="failed" class="p-error" role="alert">{{ failed }}</p>
      <p v-else class="p-hint" role="status">Preparando la imagen…</p>
    </div>

    <div class="share__actions">
      <button type="button" class="p-button" :disabled="!card" @click="onSend">
        Enviar por WhatsApp
      </button>
      <div class="share__more">
        <button
          type="button"
          class="p-link"
          :disabled="!card"
          @click="card && download(card, 'pdf')"
        >
          Descargar PDF
        </button>
        <button
          type="button"
          class="p-link"
          :disabled="!card"
          @click="card && download(card, 'image')"
        >
          Descargar imagen
        </button>
        <button type="button" class="p-link" @click="copy(shareMessage(invitation), 'mensaje')">
          {{ copied === 'mensaje' ? '¡Mensaje copiado!' : 'Copiar mensaje' }}
        </button>
      </div>
      <p v-if="status" class="p-hint" role="status">{{ status }}</p>
      <p v-else-if="card && !canShare" class="p-hint">
        En la computadora: se descarga el PDF y se abre WhatsApp con el mensaje.
      </p>
      <p class="p-hint share__note">
        Se envía como PDF: al tocar la invitación o su código, se abre. El enlace no se ve.
      </p>
    </div>
  </dialog>
</template>

<style scoped>
.share {
  width: min(100% - 2rem, 30rem);
  max-height: calc(100dvh - 2rem);
  padding: 1.2rem;
  border: 1px solid var(--p-line);
  border-radius: 18px;
  background: var(--p-card);
  color: var(--p-text);
  box-shadow: 0 20px 60px rgb(20 40 60 / 0.25);
}
.share::backdrop {
  background: rgb(20 35 50 / 0.45);
}
.share__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}
.share__title {
  margin: 0;
  font-family: var(--p-font-title);
  font-weight: 400;
  font-size: 1.2rem;
}
.share__close {
  width: 2.4rem;
  height: 2.4rem;
  border: 0;
  border-radius: 50%;
  background: var(--p-soft);
  color: var(--p-text);
  font-size: 1.5rem;
  line-height: 1;
  cursor: pointer;
}
.share__preview {
  display: grid;
  place-items: center;
  min-height: 12rem;
  margin: 0.9rem 0;
}
.share__preview img {
  width: auto;
  max-width: 100%;
  max-height: 52dvh;
  border-radius: 10px;
  box-shadow: 0 6px 20px rgb(20 40 60 / 0.15);
}
.share__actions {
  display: grid;
  gap: 0.6rem;
  text-align: center;
}
.share__more {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.2rem 1.2rem;
}
.share__note {
  font-size: 0.85rem;
}
</style>
