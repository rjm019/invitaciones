<script setup lang="ts">
import { ref, watch } from 'vue'
import InvitationRenderer from '@/components/InvitationRenderer.vue'
import PageLoader from '@/components/ui/PageLoader.vue'
import { getEvent } from '@/services/eventService'
import { ApiError } from '@/services/http'
import type { EventConfig } from '@/types/event'
import NotFoundPage from './NotFoundPage.vue'

/** /e/:slug — invitación general del evento (sin pases). */
const props = defineProps<{ slug: string }>()

const event = ref<EventConfig | null>(null)
const status = ref<'loading' | 'ready' | 'not-found' | 'error'>('loading')
const message = ref('')

watch(
  () => props.slug,
  async (slug) => {
    status.value = 'loading'
    try {
      event.value = await getEvent(slug)
      document.title = event.value.title || 'Invitación'
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
