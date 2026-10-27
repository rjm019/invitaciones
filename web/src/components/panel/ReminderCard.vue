<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ApiError } from '@/services/http'
import { reminderStateText } from '@/services/reminderService'
import type { PanelReminders } from '@/types/panel'

/**
 * Recordatorios por WhatsApp (solo si el gestor los encendió para esta invitación): cada
 * cuántos días se le escribe a quien aún no responde. Para encender hace falta marcar que
 * se tiene permiso de esas personas; el servidor lo vuelve a exigir.
 */
const props = defineProps<{
  reminders: PanelReminders
  change: (everyDays: number, consent: boolean) => Promise<void>
}>()

const everyDays = ref(props.reminders.every_days)
const consent = ref(!!props.reminders.consent_at)
const sending = ref(false)
const error = ref('')
const done = ref('')

// El panel se actualiza solo: si cambia desde el servidor, el formulario lo sigue.
watch(
  () => [props.reminders.every_days, props.reminders.consent_at] as const,
  ([days, at]) => {
    everyDays.value = days
    consent.value = !!at
  },
)

const dirty = computed(
  () =>
    everyDays.value !== props.reminders.every_days ||
    consent.value !== !!props.reminders.consent_at,
)
const state = computed(() => reminderStateText(props.reminders))
const without = computed(() => props.reminders.with_phone === 0)

async function save() {
  error.value = ''
  done.value = ''
  if (everyDays.value > 0 && !consent.value) {
    error.value =
      'Marca que tienes permiso de estas personas para poder encender los recordatorios.'
    return
  }
  sending.value = true
  try {
    await props.change(everyDays.value, consent.value)
    done.value =
      everyDays.value > 0
        ? 'Listo: los recordatorios quedaron encendidos.'
        : 'Listo: los recordatorios están apagados.'
  } catch (e) {
    const fields = e instanceof ApiError && !Array.isArray(e.errors) ? e.errors : {}
    error.value = fields.consent?.[0] ?? (e instanceof Error ? e.message : 'No se pudo guardar.')
  } finally {
    sending.value = false
  }
}
</script>

<template>
  <section class="p-card reminders" aria-labelledby="reminders-title">
    <h2 id="reminders-title" class="p-card__title">Recordatorios por WhatsApp</h2>
    <p class="p-hint">
      Le escribimos a quien todavía no responde. Quien ya confirmó o dijo que no, ya no recibe nada.
    </p>

    <form class="reminders__form" novalidate @submit.prevent="save">
      <label for="reminders-every">Frecuencia</label>
      <select id="reminders-every" v-model.number="everyDays" :disabled="sending">
        <option :value="0">Apagado</option>
        <option v-for="n in reminders.options" :key="n" :value="n">Cada {{ n }} días</option>
      </select>

      <label class="reminders__consent">
        <input v-model="consent" type="checkbox" :disabled="sending" />
        <span>Tengo permiso de estas personas para enviarles recordatorios por WhatsApp</span>
      </label>

      <button type="submit" class="p-button p-button--small" :disabled="sending || !dirty">
        {{ sending ? 'Guardando…' : 'Guardar' }}
      </button>
    </form>

    <p class="reminders__state">
      <span class="p-chip" :class="reminders.active ? 'p-chip--ok' : 'p-chip--no'">{{
        reminders.active ? 'Encendido' : 'Apagado'
      }}</span>
      {{ state }}
    </p>
    <p class="p-hint">Mensajes usados: {{ reminders.used }} de {{ reminders.cap }}</p>
    <p class="p-hint">
      Con teléfono: {{ reminders.with_phone }} · Sin responder con teléfono:
      {{ reminders.pending_with_phone }} · Sin teléfono: {{ reminders.pending_without_phone }}
    </p>
    <p v-if="without" class="p-hint">Captura el teléfono en cada invitación para empezar.</p>

    <p v-if="error" class="p-error" role="alert">{{ error }}</p>
    <p v-if="done" class="reminders__done" role="status">{{ done }}</p>
  </section>
</template>

<style scoped>
.reminders__form {
  display: grid;
  gap: 0.5rem;
  margin: 1rem 0;
}
.reminders__form label {
  font-weight: 600;
}
.reminders__form select {
  min-height: 2.9rem;
  padding: 0.55rem 0.8rem;
  border: 1px solid var(--p-line);
  border-radius: 10px;
  background: var(--p-card);
  color: var(--p-text);
  font: inherit;
}
.reminders__form .reminders__consent {
  display: flex;
  align-items: flex-start;
  gap: 0.6rem;
  font-weight: 400;
}
.reminders__consent input {
  flex: none;
  width: 1.2rem;
  height: 1.2rem;
  margin-top: 0.2rem;
}
.reminders__form .p-button {
  justify-self: start;
}
.reminders__state {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  margin: 0 0 0.4rem;
  font-weight: 600;
}
.reminders__done {
  margin: 0.6rem 0 0;
  color: var(--p-ok);
  font-weight: 600;
}
</style>
