<script setup lang="ts">
import { ref, watch } from 'vue'
import InvitationRenderer from '@/components/InvitationRenderer.vue'
import PageLoader from '@/components/ui/PageLoader.vue'
import { provideInvitation } from '@/composables/useInvitation'
import { ApiError } from '@/services/http'
import { getInvitation } from '@/services/invitationService'
import { trackVisit } from '@/services/visitService'
import type { EventConfig } from '@/types/event'
import type { PanelBrand } from '@/types/panel'
import EndedPage from './EndedPage.vue'
import NotFoundPage from './NotFoundPage.vue'

/** /i/:token — invitación personal de una familia, con sus pases y su confirmación. */
const props = defineProps<{ token: string }>()

const context = provideInvitation(props.token)
const event = ref<EventConfig | null>(null)
const status = ref<'loading' | 'ready' | 'not-found' | 'ended' | 'error'>('loading')
const message = ref('')
const brand = ref<PanelBrand | null>(null)

watch(
  () => props.token,
  async (token) => {
    status.value = 'loading'
    try {
      const data = await getInvitation(token)
      event.value = data.event
      context.invitation.value = data.invitation
      document.title = data.event.title || 'Invitación'
      status.value = 'ready'
      // El token no se manda: la visita se anota como "/i" con su evento.
      trackVisit(
        window,
        { event: data.event.slug, demo: data.event.demo },
        import.meta.env.VITE_API_URL,
      )
    } catch (e) {
      if (e instanceof ApiError && e.status === 410) {
        // El evento ya terminó: la API manda los colores para mostrarlo con su diseño.
        brand.value = (e.data as { brand?: PanelBrand } | null)?.brand ?? null
        status.value = 'ended'
        return
      }
      status.value = e instanceof ApiError && e.status === 404 ? 'not-found' : 'error'
      message.value = e instanceof Error ? e.message : 'Algo salió mal.'
    }
  },
  { immediate: true },
)
</script>

<template>
  <InvitationRenderer v-if="status === 'ready' && event" :event="event" />
  <NotFoundPage v-else-if="status === 'not-found'" />
  <EndedPage v-else-if="status === 'ended'" :brand="brand" />
  <PageLoader v-else-if="status === 'loading'" />
  <PageLoader v-else :message="message" :busy="false" />
</template>
