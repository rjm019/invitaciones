<script setup lang="ts">
import { computed, ref } from 'vue'
import { longDate } from '@/services/dateFormatService'
import { changesLabel } from '@/services/panelService'
import type { PanelRsvp } from '@/types/panel'

/**
 * Fecha límite de confirmación. Se puede cambiar hasta 3 veces (lo cuenta el servidor);
 * antes de gastar un cambio se pide confirmarlo.
 */
const props = defineProps<{
  rsvp: PanelRsvp
  bounds: { min: string; max: string | null }
  change: (date: string) => Promise<void>
}>()

const date = ref('')
const confirming = ref(false)
const sending = ref(false)
const error = ref('')
const done = ref('')

const current = computed(() =>
  props.rsvp.deadline ? longDate(props.rsvp.deadline) : 'Sin fecha límite',
)
const canChange = computed(() => props.rsvp.changes_left > 0)

function ask() {
  done.value = ''
  error.value = ''
  if (!date.value) {
    error.value = 'Elige la nueva fecha.'
    return
  }
  confirming.value = true
}

async function save() {
  sending.value = true
  try {
    await props.change(date.value)
    done.value = `Listo: ahora se puede confirmar hasta el ${longDate(date.value)}.`
    date.value = ''
    confirming.value = false
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'No se pudo cambiar la fecha.'
    confirming.value = false
  } finally {
    sending.value = false
  }
}
</script>

<template>
  <section class="p-card deadline" aria-labelledby="deadline-title">
    <h2 id="deadline-title" class="p-card__title">Fecha límite para confirmar</h2>
    <p class="deadline__date">
      {{ current }}
      <span class="p-chip" :class="rsvp.open ? 'p-chip--ok' : 'p-chip--no'">{{
        rsvp.open ? 'Abiertas' : 'Cerradas'
      }}</span>
    </p>
    <p class="p-hint">
      Al llegar la fecha, solo cuentan los nombres ya enviados; los lugares vacíos se cierran.
      <strong>{{ changesLabel(rsvp) }}.</strong>
    </p>

    <form v-if="canChange" class="deadline__form" novalidate @submit.prevent="ask">
      <label for="deadline-input">Nueva fecha</label>
      <div class="deadline__row">
        <input
          id="deadline-input"
          v-model="date"
          type="date"
          :min="bounds.min"
          :max="bounds.max ?? undefined"
          :disabled="sending"
        />
        <button v-if="!confirming" type="submit" class="p-button p-button--small">
          Cambiar fecha
        </button>
      </div>
      <div
        v-if="confirming"
        class="deadline__confirm"
        role="alertdialog"
        aria-labelledby="deadline-confirm"
      >
        <p id="deadline-confirm">
          ¿Cambiar al <strong>{{ longDate(date) }}</strong
          >? Usarás 1 de tus {{ rsvp.changes_left }}
          {{ rsvp.changes_left === 1 ? 'cambio restante' : 'cambios restantes' }}.
        </p>
        <div class="p-actions">
          <button type="button" class="p-button p-button--small" :disabled="sending" @click="save">
            {{ sending ? 'Guardando…' : 'Sí, cambiar' }}
          </button>
          <button
            type="button"
            class="p-button p-button--small p-button--ghost"
            :disabled="sending"
            @click="confirming = false"
          >
            Cancelar
          </button>
        </div>
      </div>
    </form>
    <p v-if="error" class="p-error" role="alert">{{ error }}</p>
    <p v-if="done" class="deadline__done" role="status">{{ done }}</p>
  </section>
</template>

<style scoped>
.deadline__date {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.6rem;
  margin: 0 0 0.4rem;
  font-size: 1.3rem;
  font-weight: 600;
}
.deadline__form {
  display: grid;
  gap: 0.4rem;
  margin-top: 1rem;
}
.deadline__form label {
  font-weight: 600;
}
.deadline__row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.deadline__row input {
  flex: 1 1 10rem;
}
.deadline__confirm {
  display: grid;
  gap: 0.6rem;
  margin-top: 0.4rem;
  padding: 0.9rem;
  border-radius: 10px;
  background: #fff4e5;
}
.deadline__confirm p {
  margin: 0;
}
.deadline__done {
  margin: 0.6rem 0 0;
  color: var(--p-ok);
  font-weight: 600;
}
</style>
