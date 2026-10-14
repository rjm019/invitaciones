<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useEditor } from '@/composables/useEditorContext'
import { sectionLabel } from '@/services/designService'
import type { DesignChange, DesignIssue, ManagerSettings } from '@/types/design'
import GDialog from './GDialog.vue'
import ManagerIcon from './ManagerIcon.vue'

/**
 * "Publicar": qué cambió, lo que falta corregir (con enlace a cada lugar) y, si el cliente
 * movió la fecha límite desde su panel, cuál dejar. La primera vez ofrece hacerla visible.
 */
const props = defineProps<{
  open: boolean
  changes: DesignChange[]
  issues: DesignIssue[]
  settings: ManagerSettings | null
  migrating: boolean
  busy: boolean
}>()
const emit = defineEmits<{
  close: []
  publish: [options: { replaceOwnerDeadline: boolean; makeVisible: boolean }]
  go: [issue: DesignIssue]
}>()
const { catalog, design } = useEditor()

const replace = ref(false)
const visible = ref(true)
watch(
  () => props.open,
  (open) => {
    if (open) {
      replace.value = false
      visible.value = true
    }
  },
)

const errors = computed(() => props.issues.filter((i) => i.level === 'error'))
const BLOCKS: Record<string, string> = {
  evento: 'Datos del evento',
  colores: 'Colores',
  fuentes: 'Letras',
  textos: 'Textos de toda la invitación',
  pagina: 'Página',
}
const WHAT = { added: 'Nueva', removed: 'Quitada', changed: 'Cambió' } as const
const lines = computed(() =>
  props.changes.map((c) => ({
    icon: c.change === 'added' ? 'plus' : c.change === 'removed' ? 'trash-can' : 'paintbrush',
    text:
      c.type === 'order'
        ? 'El orden de las secciones'
        : c.type === 'block'
          ? (BLOCKS[c.key ?? ''] ?? c.key)
          : `${WHAT[c.change]}: ${sectionLabel(catalog.value, c.key ?? '')}`,
  })),
)
const deadlineQuestion = computed(
  () => !!props.settings?.owner_deadline && props.changes.some((c) => c.key === 'evento'),
)
const firstTime = computed(
  () => props.settings && !props.settings.published && !props.settings.template,
)
const where = (issue: DesignIssue) =>
  issue.block === 'evento'
    ? 'Datos generales'
    : catalog.value.sections.length && design.value.sections.some((s) => s.id === issue.block)
      ? sectionLabel(catalog.value, issue.block)
      : issue.block
</script>

<template>
  <GDialog :open="open" title="Publicar la invitación" size="md" @close="emit('close')">
    <div class="publish">
      <template v-if="errors.length">
        <p class="g-note g-note--danger">
          <ManagerIcon name="triangle-exclamation" />
          <span
            >Antes de publicar, corrige
            {{ errors.length === 1 ? 'esto' : `estas ${errors.length} cosas` }}:</span
          >
        </p>
        <ul class="publish__issues">
          <li v-for="(issue, i) in errors" :key="i">
            <button type="button" class="publish__issue" @click="emit('go', issue)">
              <strong>{{ where(issue) }}</strong>
              <span>{{ issue.message.split(': ').slice(1).join(': ') || issue.message }}</span>
              <ManagerIcon name="chevron-right" />
            </button>
          </li>
        </ul>
      </template>

      <template v-else>
        <p v-if="migrating" class="g-note">
          <ManagerIcon name="circle-info" />
          <span
            >Esta invitación está en el formato anterior (Excel). Al publicar pasa al formato nuevo;
            su Excel se guarda en respaldos.</span
          >
        </p>
        <div v-if="lines.length" class="publish__changes">
          <p class="publish__lead">Los invitados verán estos cambios:</p>
          <ul>
            <li v-for="(l, i) in lines" :key="i"><ManagerIcon :name="l.icon" /> {{ l.text }}</li>
          </ul>
        </div>

        <div v-if="deadlineQuestion" class="publish__question">
          <p>
            El cliente movió la fecha límite al
            <strong>{{ settings?.owner_deadline }}</strong> desde su panel. ¿Cuál dejas?
          </p>
          <label class="publish__option">
            <input v-model="replace" type="radio" :value="false" /> La del cliente ({{
              settings?.owner_deadline
            }})
          </label>
          <label class="publish__option">
            <input v-model="replace" type="radio" :value="true" /> La que pusiste aquí ({{
              design.event.rsvp_limite || 'sin fecha'
            }})
          </label>
        </div>

        <label v-if="firstTime" class="g-switch publish__visible">
          <input v-model="visible" type="checkbox" />
          <span class="g-switch__track" />
          <span>También hacerla visible para los invitados</span>
        </label>
      </template>
    </div>

    <template #footer>
      <button type="button" class="g-btn" @click="emit('close')">
        {{ errors.length ? 'Cerrar' : 'Cancelar' }}
      </button>
      <button
        v-if="!errors.length"
        type="button"
        class="g-btn g-btn--primary"
        :disabled="busy"
        @click="
          emit('publish', { replaceOwnerDeadline: replace, makeVisible: !!firstTime && visible })
        "
      >
        <ManagerIcon :name="busy ? 'spinner' : 'cloud'" :spin="busy" /> Publicar
      </button>
    </template>
  </GDialog>
</template>

<style scoped>
.publish {
  display: grid;
  gap: 14px;
}
.publish__issues {
  display: grid;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.publish__issue {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #f2c4c2;
  border-radius: 10px;
  background: #fff;
  color: var(--g-text);
  font: inherit;
  text-align: left;
  cursor: pointer;
}
.publish__issue:hover {
  background: var(--g-danger-soft);
}
.publish__issue span {
  color: var(--g-muted);
  font-size: 12.5px;
}
.publish__lead {
  margin-bottom: 6px;
  color: var(--g-muted);
}
.publish__changes ul {
  display: grid;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.publish__changes li {
  display: flex;
  align-items: center;
  gap: 8px;
}
.publish__changes .g-icon {
  color: var(--g-accent);
}
.publish__question {
  display: grid;
  gap: 8px;
  padding: 12px;
  border-radius: 10px;
  background: var(--g-warn-soft);
}
.publish__option {
  display: flex;
  align-items: center;
  gap: 8px;
}
.publish__visible {
  padding: 10px 0 0;
}
</style>
