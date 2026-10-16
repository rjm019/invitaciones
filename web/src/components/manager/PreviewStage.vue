<script setup lang="ts">
import { computed } from 'vue'
import InvitationRenderer from '@/components/InvitationRenderer.vue'
import {
  createPreviewInvitationContext,
  provideInvitationContext,
} from '@/composables/useInvitation'
import { forGeneralLink } from '@/services/giftService'
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
// Como invitado general, sin los datos bancarios "solo con enlace" (como lo manda el servidor).
const shown = computed(() =>
  props.display.guest === 'personal' ? props.event : forGeneralLink(props.event),
)
</script>

<template>
  <InvitationRenderer
    :event="shown"
    :preview="{ envelopeOpen: display.envelope === 'open', muted: display.muted }"
  />
</template>
