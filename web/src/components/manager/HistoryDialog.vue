<script setup lang="ts">
import { ref, watch } from 'vue'
import { useManagerSession } from '@/composables/useManagerSession'
import { publishedBy } from '@/services/managerAccountService'
import * as managerService from '@/services/managerService'
import type { HistoryVersion, PublishRecord } from '@/types/design'
import GDialog from './GDialog.vue'
import ManagerIcon from './ManagerIcon.vue'

/**
 * La versión que ven los invitados y las que se publicaron antes, con quién las publicó;
 * cualquiera de antes se puede volver a traer al borrador.
 */
const props = defineProps<{ open: boolean; slug: string }>()
const emit = defineEmits<{ close: []; restore: [id: string] }>()
const { withSession } = useManagerSession()
const current = ref<PublishRecord | null>(null)
const versions = ref<HistoryVersion[]>([])
const loading = ref(false)
const error = ref('')

watch(
  () => props.open,
  async (open) => {
    if (!open) return
    loading.value = true
    try {
      const history = await withSession((t) => managerService.getHistory(t, props.slug))
      current.value = history.current
      versions.value = history.versions
      error.value = ''
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'No se pudo cargar el historial.'
    } finally {
      loading.value = false
    }
  },
)

const when = (iso: string) =>
  new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(iso),
  )
</script>

<template>
  <GDialog :open="open" title="Historial de publicaciones" size="sm" @close="emit('close')">
    <p class="g-help history__lead">
      Cada vez que alguien publica se guarda la versión anterior (las últimas 50). Restaurar la trae
      al borrador: la revisas y la vuelves a publicar.
    </p>
    <p v-if="error" class="g-note g-note--danger">{{ error }}</p>
    <div v-if="current" class="history__now">
      <ManagerIcon name="eye" />
      <span>
        <strong>La que ven los invitados:</strong>
        {{ publishedBy(current.origin, current.by?.name) }} el {{ when(current.published_at) }}
      </span>
    </div>
    <ul v-if="versions.length" class="history">
      <li v-for="v in versions" :key="v.id">
        <ManagerIcon name="clock-rotate-left" />
        <span class="history__date">
          <template v-if="v.published_at">
            {{ when(v.published_at) }}
            <small>{{ publishedBy(v.origin, v.by?.name) }}</small>
          </template>
          <template v-else-if="v.replaced_at">
            Hasta el {{ when(v.replaced_at) }}
            <small>Sin registro de quién la publicó</small>
          </template>
        </span>
        <button
          type="button"
          class="g-btn g-btn--small"
          @click="(emit('restore', v.id), emit('close'))"
        >
          Restaurar
        </button>
      </li>
    </ul>
    <div v-else-if="!loading" class="g-empty">
      <ManagerIcon name="clock-rotate-left" />
      <span>Todavía no hay versiones anteriores.</span>
    </div>
  </GDialog>
</template>

<style scoped>
.history__lead {
  margin-bottom: 12px;
}
.history {
  display: grid;
  gap: 4px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.history li {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 6px;
  border-bottom: 1px solid var(--g-line);
  color: var(--g-muted);
}
.history__now {
  display: flex;
  gap: 10px;
  margin-bottom: 8px;
  padding: 10px 12px;
  border-radius: 10px;
  background: var(--g-surface-2);
  color: var(--g-muted);
  font-size: 13px;
}
.history__now strong {
  color: var(--g-text);
}
.history__date {
  display: grid;
  flex: 1;
  color: var(--g-text);
}
.history__date small {
  color: var(--g-faint);
  font-size: 12px;
}
</style>
