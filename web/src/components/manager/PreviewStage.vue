<script setup lang="ts">
import InvitationRenderer from '@/components/InvitationRenderer.vue'
import {
  createPreviewInvitationContext,
  provideInvitationContext,
} from '@/composables/useInvitation'
import { previewInvitation } from '@/services/previewService'
import type { PreviewDisplay } from '@/services/previewProtocol'
import type { EventConfig } from '@/types/event'

/**
 * La invitación dentro de la vista previa del gestor. Como invitado "personal" lleva una
 * invitación de ejemplo (4 lugares) para ver la confirmación y la dedicatoria; como
 * "general", la de /e/<slug>. Se vuelve a montar cuando cambia el invitado o el sobre.
 */
const props = defineProps<{ event: EventConfig; display: PreviewDisplay }>()

if (props.display.guest === 'personal') {
  provideInvitationContext(createPreviewInvitationContext(previewInvitation(props.event)))
}
</script>

<template>
  <InvitationRenderer
    :event="event"
    :preview="{ envelopeOpen: display.envelope === 'open', muted: display.muted }"
  />
</template>
