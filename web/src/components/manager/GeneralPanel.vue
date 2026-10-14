<script setup lang="ts">
import { computed, ref } from 'vue'
import { useClipboard } from '@/composables/useClipboard'
import { useEditor } from '@/composables/useEditorContext'
import { useToasts } from '@/composables/useToasts'
import type { ManagerSettings } from '@/types/design'
import FieldInput from './FieldInput.vue'
import ManagerIcon from './ManagerIcon.vue'
import SharePreview from './SharePreview.vue'

/**
 * "Datos generales": lo del evento (nombres, fecha, salón, confirmaciones, música, el
 * mensaje de WhatsApp y la tarjeta), el acceso del cliente a su panel y si la invitación
 * se ve. La clave y "visible" se guardan al instante (no esperan a "Publicar").
 */
defineProps<{ settings: ManagerSettings | null }>()
const emit = defineEmits<{
  settings: [changes: { panel_password?: string | null; published?: boolean }]
}>()
const { slug, catalog, design, issues, setBlock } = useEditor()
const { toast } = useToasts()
const { copy } = useClipboard()

const groups = computed(() =>
  catalog.value.event_groups.map((g) => ({
    ...g,
    fields: g.fields.filter((f) => !f.hidden && f.key !== 'tema'),
  })),
)
const error = (key: string) =>
  issues.value
    .find((i) => i.block === 'evento' && i.field === key && i.level === 'error')
    ?.message.split(': ')
    .slice(1)
    .join(': ') ?? null

const showPassword = ref(false)
/** Cambiar una clave que ya existe saca al cliente de su panel: se pregunta antes. */
const confirmNew = ref(false)
const publicUrl = computed(() => `${location.origin}/e/${slug}`)
const panelUrl = computed(() => `${location.origin}/panel/${slug}`)

const VARIABLES = [
  { token: '{familia}', label: 'Nombre de la invitación' },
  { token: '{, familia}', label: '", Familia Pérez" si tiene nombre' },
  { token: '{pases}', label: '"4 pases"' },
  { token: '{enlace}', label: 'El enlace' },
]
function insert(token: string): void {
  const current = design.value.event.mensaje_whatsapp ?? ''
  setBlock(
    'event',
    'mensaje_whatsapp',
    `${current}${current && !current.endsWith(' ') ? ' ' : ''}${token}`,
  )
}
const sampleMessage = computed(() =>
  (design.value.event.mensaje_whatsapp ?? '')
    .replace(/\{,\s*familia\}/g, ', Familia Pérez')
    .replace(/\{familia\}/g, 'Familia Pérez')
    .replace(/\{pases\}/g, '4 pases')
    .replace(/\{enlace\}/g, `${location.origin}/i/…`),
)

function newPassword(): void {
  const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789'
  const random = new Uint32Array(12)
  crypto.getRandomValues(random)
  const chars = [...random].map((n) => alphabet[n % alphabet.length])
  emit('settings', {
    panel_password: `${chars.slice(0, 4).join('')}-${chars.slice(4, 8).join('')}-${chars.slice(8).join('')}`,
  })
  confirmNew.value = false
  showPassword.value = true
}
async function copyText(text: string, what: string): Promise<void> {
  if (await copy(text)) toast(`${what} copiado`)
}
</script>

<template>
  <div class="general">
    <header class="general__head">
      <span class="general__icon"><ManagerIcon name="sliders" /></span>
      <div>
        <h2>Datos generales</h2>
        <p>Del evento, para todas las secciones.</p>
      </div>
    </header>

    <div class="general__scroll">
      <section class="g-group">
        <h3 class="g-group__title">Publicación</h3>
        <template v-if="settings?.template">
          <p class="g-note">
            <ManagerIcon name="layer-group" /> Es una plantilla: nunca se publica ni tiene panel del
            cliente.
          </p>
        </template>
        <template v-else-if="settings">
          <label class="g-switch">
            <input
              type="checkbox"
              :checked="settings.published"
              @change="emit('settings', { published: ($event.target as HTMLInputElement).checked })"
            />
            <span class="g-switch__track" />
            <span>
              <strong>{{ settings.published ? 'Visible para los invitados' : 'Oculta' }}</strong>
              <small class="general__sub">Cambia al instante.</small>
            </span>
          </label>
          <div class="general__link">
            <code>{{ publicUrl }}</code>
            <button
              type="button"
              class="g-icon-btn"
              aria-label="Copiar el enlace"
              title="Copiar"
              @click="copyText(publicUrl, 'Enlace')"
            >
              <ManagerIcon name="copy" />
            </button>
            <a
              class="g-icon-btn"
              :href="publicUrl"
              target="_blank"
              rel="noopener"
              aria-label="Abrir la invitación"
              title="Abrir"
              ><ManagerIcon name="arrow-up-right-from-square"
            /></a>
          </div>

          <h3 class="g-group__title general__subtitle">Acceso del cliente</h3>
          <p class="g-help">
            Con esta clave el cliente entra a su panel: genera los enlaces de sus invitados y ve
            quién confirmó.
          </p>
          <div class="general__password">
            <input
              class="g-input"
              :type="showPassword ? 'text' : 'password'"
              :value="settings.panel_password ?? ''"
              readonly
              aria-label="Clave del panel del cliente"
            />
            <button
              type="button"
              class="g-icon-btn"
              :aria-label="showPassword ? 'Ocultar la clave' : 'Ver la clave'"
              @click="showPassword = !showPassword"
            >
              <ManagerIcon :name="showPassword ? 'eye-slash' : 'eye'" />
            </button>
            <button
              v-if="settings.panel_password"
              type="button"
              class="g-icon-btn"
              aria-label="Copiar la clave"
              @click="copyText(settings.panel_password, 'Clave')"
            >
              <ManagerIcon name="copy" />
            </button>
          </div>
          <p v-if="confirmNew" class="g-note g-note--warn general__note">
            <ManagerIcon name="triangle-exclamation" />
            <span>Si el cliente tiene su panel abierto, tendrá que entrar con la clave nueva.</span>
          </p>
          <div v-if="confirmNew" class="g-row general__actions">
            <button type="button" class="g-btn g-btn--small g-btn--primary" @click="newPassword">
              Sí, generar otra
            </button>
            <button
              type="button"
              class="g-btn g-btn--small g-btn--ghost"
              @click="confirmNew = false"
            >
              Cancelar
            </button>
          </div>
          <div v-else class="g-row general__actions">
            <button
              type="button"
              class="g-btn g-btn--small"
              @click="settings.panel_password ? (confirmNew = true) : newPassword()"
            >
              <ManagerIcon name="key" />
              {{ settings.panel_password ? 'Generar clave nueva' : 'Generar clave' }}
            </button>
            <a
              class="g-btn g-btn--small g-btn--ghost"
              :href="panelUrl"
              target="_blank"
              rel="noopener"
              ><ManagerIcon name="user" /> Abrir su panel</a
            >
          </div>
        </template>
      </section>

      <section v-for="g in groups" :key="g.label" class="g-group">
        <h3 class="g-group__title">{{ g.label }}</h3>
        <p
          v-if="g.label === 'Confirmaciones' && settings?.owner_deadline"
          class="g-note g-note--warn general__note"
        >
          <ManagerIcon name="circle-info" />
          <span
            >El cliente movió la fecha límite al
            <strong>{{ settings.owner_deadline }}</strong> desde su panel ({{
              settings.deadline_changes
            }}
            de 3 cambios): esa es la que vale. Si publicas otra, te preguntaremos cuál dejar.</span
          >
        </p>
        <template v-for="f in g.fields" :key="f.key">
          <FieldInput
            :def="f"
            :model-value="design.event[f.key] ?? ''"
            :error="error(f.key)"
            @update:model-value="(v) => setBlock('event', f.key, v)"
          />
          <div v-if="f.key === 'mensaje_whatsapp'" class="general__vars">
            <button
              v-for="v in VARIABLES"
              :key="v.token"
              type="button"
              class="g-chip"
              :title="v.label"
              @click="insert(v.token)"
            >
              {{ v.token }}
            </button>
            <p v-if="sampleMessage" class="general__sample">{{ sampleMessage }}</p>
          </div>
        </template>
        <SharePreview v-if="g.label === 'Compartir' && !settings?.template" />
      </section>
    </div>
  </div>
</template>

<style scoped>
.general {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  grid-template-rows: auto 1fr;
  height: 100%;
  min-height: 0;
}
.general__head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px 12px;
  border-bottom: 1px solid var(--g-line);
}
.general__head h2 {
  font-size: 15px;
  font-weight: 700;
}
.general__head p {
  color: var(--g-faint);
  font-size: 12px;
}
.general__icon {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: var(--g-surface-3);
  color: var(--g-muted);
}
.general__scroll {
  min-height: 0;
  overflow: auto;
}
.general__sub {
  display: block;
  color: var(--g-faint);
  font-size: 12px;
}
.general__link {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 12px;
  padding: 4px 4px 4px 10px;
  border: 1px solid var(--g-line);
  border-radius: 9px;
  background: var(--g-surface-2);
}
.general__link code {
  flex: 1;
  overflow: hidden;
  font-size: 12px;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.general__subtitle {
  margin-top: 20px;
}
.general__password {
  display: flex;
  gap: 4px;
  margin-top: 8px;
}
.general__password input {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}
.general__actions {
  flex-wrap: wrap;
  margin-top: 8px;
}
.general__note {
  margin-bottom: 12px;
}
.general__vars {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 6px;
}
.general__sample {
  width: 100%;
  margin-top: 4px;
  padding: 10px 12px;
  border-radius: 12px 12px 12px 4px;
  background: #e7f8ee;
  color: #14432a;
  font-size: 12.5px;
  white-space: pre-wrap;
}
</style>
