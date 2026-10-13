<script setup lang="ts">
import { computed, ref } from 'vue'
import { useClipboard } from '@/composables/useClipboard'
import { ApiError } from '@/services/http'
import type { PanelInvitation } from '@/types/panel'

/**
 * Generar un enlace: para cuántos invitados es (1…max) y, si se quiere, el nombre que
 * aparecerá en la invitación. Al generarlo, queda listo para copiar o mandar por WhatsApp.
 */
const props = defineProps<{
  maxPasses: number
  create: (passes: number, label: string) => Promise<PanelInvitation>
}>()
const emit = defineEmits<{ created: [invitation: PanelInvitation] }>()

const passes = ref(1)
const label = ref('')
const errors = ref<Record<string, string>>({})
const sending = ref(false)
const created = ref<PanelInvitation | null>(null)
const { copied, copy } = useClipboard()

const valid = computed(
  () => Number.isInteger(passes.value) && passes.value >= 1 && passes.value <= props.maxPasses,
)

function step(delta: number) {
  passes.value = Math.min(props.maxPasses, Math.max(1, (Number(passes.value) || 1) + delta))
}

async function submit() {
  errors.value = {}
  if (!valid.value) {
    errors.value = { passes: `Escribe para cuántos invitados es (de 1 a ${props.maxPasses}).` }
    return
  }
  sending.value = true
  try {
    created.value = await props.create(passes.value, label.value)
    emit('created', created.value)
    label.value = ''
  } catch (e) {
    const fields = e instanceof ApiError && !Array.isArray(e.errors) ? e.errors : {}
    errors.value = Object.keys(fields).length
      ? Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, v[0] ?? '']))
      : { form: e instanceof Error ? e.message : 'No se pudo generar.' }
  } finally {
    sending.value = false
  }
}
</script>

<template>
  <section class="p-card creator" aria-labelledby="creator-title">
    <h2 id="creator-title" class="p-card__title">Generar enlace</h2>

    <form class="creator__form" novalidate @submit.prevent="submit">
      <div class="creator__field">
        <label for="creator-passes">¿Para cuántos invitados?</label>
        <div class="creator__stepper">
          <button
            type="button"
            class="creator__step"
            aria-label="Uno menos"
            :disabled="passes <= 1"
            @click="step(-1)"
          >
            −
          </button>
          <input
            id="creator-passes"
            v-model.number="passes"
            type="number"
            inputmode="numeric"
            min="1"
            :max="maxPasses"
            :aria-invalid="!!errors.passes"
          />
          <button
            type="button"
            class="creator__step"
            aria-label="Uno más"
            :disabled="passes >= maxPasses"
            @click="step(1)"
          >
            +
          </button>
        </div>
        <p v-if="errors.passes" class="p-error">{{ errors.passes }}</p>
      </div>

      <div class="creator__field">
        <label for="creator-label">Nombre en la invitación <small>(opcional)</small></label>
        <input
          id="creator-label"
          v-model="label"
          type="text"
          maxlength="80"
          placeholder="Familia Pérez"
          :aria-invalid="!!errors.label"
        />
        <p class="p-hint">Aparece en el sobre. Déjalo vacío si no quieres nombre.</p>
        <p v-if="errors.label" class="p-error">{{ errors.label }}</p>
      </div>

      <button type="submit" class="p-button" :disabled="sending">
        {{
          sending
            ? 'Generando…'
            : `Generar enlace para ${passes || 1} ${passes === 1 ? 'invitado' : 'invitados'}`
        }}
      </button>
      <p v-if="errors.form" class="p-error" role="alert">{{ errors.form }}</p>
    </form>

    <div v-if="created" class="creator__done" role="status">
      <p class="creator__done-title">
        Enlace #{{ created.id }} listo · {{ created.passes }}
        {{ created.passes === 1 ? 'invitado' : 'invitados' }}
        <template v-if="created.label"> · {{ created.label }}</template>
      </p>
      <input
        class="creator__url"
        :value="created.url"
        readonly
        aria-label="Enlace generado"
        @focus="($event.target as HTMLInputElement).select()"
      />
      <div class="p-actions">
        <button type="button" class="p-button p-button--small" @click="copy(created.url, 'nuevo')">
          {{ copied === 'nuevo' ? '¡Copiado!' : 'Copiar enlace' }}
        </button>
        <a
          class="p-button p-button--small p-button--ghost"
          :href="created.whatsapp_url"
          target="_blank"
          rel="noopener"
          >Mandar por WhatsApp</a
        >
      </div>
    </div>
  </section>
</template>

<style scoped>
.creator__form {
  display: grid;
  gap: 1rem;
}
.creator__field {
  display: grid;
  gap: 0.35rem;
}
.creator__field label {
  font-weight: 600;
}
.creator__field small {
  font-weight: 400;
  color: var(--p-muted);
}
.creator__stepper {
  display: grid;
  grid-template-columns: 3rem 1fr 3rem;
  gap: 0.4rem;
}
.creator__stepper input {
  text-align: center;
  font-size: 1.3rem;
  font-weight: 600;
}
.creator__step {
  border: 1px solid var(--p-line);
  border-radius: 8px;
  background: var(--p-bg);
  font-size: 1.4rem;
  cursor: pointer;
}
.creator__step:disabled {
  opacity: 0.4;
  cursor: default;
}
.creator__done {
  display: grid;
  gap: 0.6rem;
  margin-top: 1.2rem;
  padding: 1rem;
  border-radius: 10px;
  background: #eef7f0;
}
.creator__done-title {
  margin: 0;
  font-weight: 600;
  color: var(--p-ok);
}
.creator__url {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.95rem;
}
</style>
