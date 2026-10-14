<script setup lang="ts">
import { ref, watch } from 'vue'
import InvitationRenderer from '@/components/InvitationRenderer.vue'
import PageLoader from '@/components/ui/PageLoader.vue'
import { provideInvitation } from '@/composables/useInvitation'
import { ApiError } from '@/services/http'
import { getInvitation } from '@/services/invitationService'
import type { EventConfig } from '@/types/event'
import NotFoundPage from './NotFoundPage.vue'

/** /i/:token — invitación personal de una familia, con sus pases y su confirmación. */
const props = defineProps<{ token: string }>()

const context = provideInvitation(props.token)
const event = ref<EventConfig | null>(null)
const status = ref<'loading' | 'ready' | 'not-found' | 'error'>('loading')
const message = ref('')

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
    } catch (e) {
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
  <PageLoader v-else-if="status === 'loading'" />
  <PageLoader v-else :message="message" :busy="false" />
</template>
