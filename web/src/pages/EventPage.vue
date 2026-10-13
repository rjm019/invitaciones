<script setup lang="ts">
import { ref, watch } from 'vue'
import InvitationRenderer from '@/components/InvitationRenderer.vue'
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
  <div v-else class="page-state" :aria-busy="status === 'loading'">
    <p v-if="status === 'loading'">Abriendo tu invitación…</p>
    <p v-else>{{ message }}</p>
  </div>
</template>

<style scoped>
.page-state {
  display: grid;
  place-items: center;
  min-height: 100vh;
  padding: 1.5rem;
  font-family: Georgia, serif;
  color: #523c0b;
  background: #f3f1ec;
  text-align: center;
}
</style>
