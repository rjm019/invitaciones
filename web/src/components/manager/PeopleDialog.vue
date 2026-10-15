<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useClipboard } from '@/composables/useClipboard'
import { useManagerSession } from '@/composables/useManagerSession'
import { useToasts } from '@/composables/useToasts'
import {
  accessMessage,
  initials,
  suggestUsername,
  USERNAME_PATTERN,
} from '@/services/managerAccountService'
import * as managerService from '@/services/managerService'
import type { ManagerUser } from '@/types/design'
import GDialog from './GDialog.vue'
import ManagerIcon from './ManagerIcon.vue'

/**
 * Personas del gestor (solo quien administra): agregar con una clave temporal, cambiar su
 * rol, darle otra clave temporal y quitar o devolver el acceso. La clave temporal se ve una
 * sola vez, junto con el mensaje listo para mandárselo.
 */
const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()
const { withSession, user: me } = useManagerSession()
const { toast } = useToasts()
const { copy, copied } = useClipboard()

const people = ref<ManagerUser[]>([])
const loading = ref(false)
const error = ref('')
const adding = ref(false)
const form = ref({ name: '', username: '', role: 'editor' as ManagerUser['role'] })
const usernameTouched = ref(false)
const formError = ref('')
const busy = ref<string | null>(null)
/** La clave temporal recién dada (solo se muestra esta vez). */
const handout = ref<{ name: string; message: string } | null>(null)

const gestorUrl = `${location.origin}/gestor`
const taken = computed(() => people.value.map((p) => p.username))

async function load(): Promise<void> {
  loading.value = true
  try {
    people.value = await withSession((t) => managerService.listUsers(t))
    error.value = ''
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'No se pudo cargar la lista.'
  } finally {
    loading.value = false
  }
}

watch(
  () => props.open,
  (open) => {
    if (!open) return
    handout.value = null
    adding.value = false
    void load()
  },
)

watch(
  () => form.value.name,
  (name) => {
    if (!usernameTouched.value) form.value.username = suggestUsername(name, taken.value)
  },
)

function startAdding(): void {
  form.value = { name: '', username: '', role: 'editor' }
  usernameTouched.value = false
  formError.value = ''
  handout.value = null
  adding.value = true
}

function replace(updated: ManagerUser): void {
  people.value = people.value.map((p) => (p.username === updated.username ? updated : p))
}

async function add(): Promise<void> {
  const name = form.value.name.trim()
  const username = form.value.username.trim().toLowerCase()
  if (!name) return void (formError.value = 'Escribe su nombre.')
  if (!USERNAME_PATTERN.test(username))
    return void (formError.value =
      'El usuario lleva de 3 a 60 minúsculas, números o . _ @ - (por ejemplo ana).')
  busy.value = 'add'
  formError.value = ''
  try {
    const created = await withSession((t) =>
      managerService.createUser(t, { name, username, role: form.value.role }),
    )
    people.value = [...people.value, created.user]
    handout.value = {
      name: created.user.name,
      message: accessMessage(gestorUrl, created.user.username, created.password),
    }
    adding.value = false
  } catch (e) {
    formError.value = e instanceof Error ? e.message : 'No se pudo agregar.'
  } finally {
    busy.value = null
  }
}

/** @returns false si el servidor no lo dejó */
async function change(
  person: ManagerUser,
  changes: Parameters<typeof managerService.updateUser>[2],
  done: string,
): Promise<boolean> {
  busy.value = person.username
  try {
    const result = await withSession((t) => managerService.updateUser(t, person.username, changes))
    replace(result.user)
    if (result.password) {
      handout.value = {
        name: result.user.name,
        message: accessMessage(gestorUrl, result.user.username, result.password),
      }
    }
    toast(done)
    return true
  } catch (e) {
    toast(e instanceof Error ? e.message : 'No se pudo cambiar.', 'error')
    return false
  } finally {
    busy.value = null
  }
}

async function setRole(person: ManagerUser, select: HTMLSelectElement): Promise<void> {
  const role = select.value as ManagerUser['role']
  if (role === person.role) return
  const done =
    role === 'admin' ? `${person.name} ya administra.` : `${person.name} ahora solo edita.`
  if (!(await change(person, { role }, done))) select.value = person.role
}

function newPassword(person: ManagerUser): void {
  if (
    window.confirm(
      `¿Darle a ${person.name} una clave temporal nueva? La de ahora deja de servir y se cierran sus sesiones.`,
    )
  )
    void change(person, { reset_password: true }, `Clave temporal nueva para ${person.name}.`)
}

function toggleAccess(person: ManagerUser): void {
  if (!person.active) {
    void change(person, { active: true }, `${person.name} puede volver a entrar.`)
    return
  }
  if (
    window.confirm(
      `¿Quitarle el acceso a ${person.name}? Ya no podrá entrar; su nombre se queda en el historial.`,
    )
  )
    void change(person, { active: false }, `${person.name} ya no puede entrar.`)
}

const when = (iso: string | null) =>
  iso
    ? new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(
        new Date(iso),
      )
    : null
</script>

<template>
  <GDialog :open="open" title="Personas del gestor" size="md" @close="emit('close')">
    <div class="people">
      <p class="g-help">
        Cada quien entra con su usuario y su clave, y el historial dice quién publicó qué.
        <strong>Administra</strong>: además agrega personas y les da o quita el acceso.
      </p>

      <div v-if="handout" class="g-note g-note--ok people__handout" role="status">
        <ManagerIcon name="key" />
        <div>
          <strong>Mándale esto a {{ handout.name }}.</strong>
          La clave temporal no se vuelve a mostrar.
          <pre>{{ handout.message }}</pre>
          <button
            type="button"
            class="g-btn g-btn--small"
            @click="copy(handout.message, 'handout')"
          >
            <ManagerIcon :name="copied === 'handout' ? 'check' : 'copy'" />
            {{ copied === 'handout' ? 'Copiado' : 'Copiar mensaje' }}
          </button>
        </div>
      </div>

      <form v-if="adding" class="people__form g-card" @submit.prevent="add">
        <div class="people__fields">
          <div class="g-field">
            <label class="g-label" for="person-name">Nombre</label>
            <input
              id="person-name"
              v-model="form.name"
              class="g-input"
              maxlength="60"
              autocomplete="off"
              autofocus
            />
          </div>
          <div class="g-field">
            <label class="g-label" for="person-user">Usuario</label>
            <input
              id="person-user"
              v-model="form.username"
              class="g-input"
              maxlength="60"
              autocapitalize="none"
              autocomplete="off"
              spellcheck="false"
              @input="usernameTouched = true"
            />
          </div>
        </div>
        <div class="g-segmented" role="radiogroup" aria-label="Qué puede hacer">
          <button
            type="button"
            role="radio"
            :aria-checked="form.role === 'editor'"
            :aria-pressed="form.role === 'editor'"
            @click="form.role = 'editor'"
          >
            Edita invitaciones
          </button>
          <button
            type="button"
            role="radio"
            :aria-checked="form.role === 'admin'"
            :aria-pressed="form.role === 'admin'"
            @click="form.role = 'admin'"
          >
            Administra
          </button>
        </div>
        <p v-if="formError" class="g-error" role="alert">{{ formError }}</p>
        <div class="people__form-actions">
          <button type="button" class="g-btn g-btn--ghost" @click="adding = false">Cancelar</button>
          <button type="submit" class="g-btn g-btn--primary" :disabled="busy === 'add'">
            <ManagerIcon :name="busy === 'add' ? 'spinner' : 'user-plus'" :spin="busy === 'add'" />
            Agregar y crear su clave
          </button>
        </div>
      </form>
      <button v-else type="button" class="g-btn people__add" @click="startAdding">
        <ManagerIcon name="user-plus" /> Agregar persona
      </button>

      <p v-if="error" class="g-note g-note--danger" role="alert">{{ error }}</p>
      <ul v-if="people.length" class="people__list" :aria-busy="loading">
        <li v-for="p in people" :key="p.username" :class="{ 'is-off': !p.active }">
          <span class="people__avatar" aria-hidden="true">{{ initials(p.name) }}</span>
          <div class="people__who">
            <strong>
              {{ p.name }}
              <span v-if="p.username === me?.username" class="people__me">(tú)</span>
            </strong>
            <span class="people__meta">
              {{ p.username }} ·
              <template v-if="p.last_login_at">entró el {{ when(p.last_login_at) }}</template>
              <template v-else>aún no entra</template>
            </span>
            <span class="people__badges">
              <span v-if="!p.active" class="g-badge g-badge--danger">Sin acceso</span>
              <span v-else-if="p.must_change_password" class="g-badge g-badge--warn"
                >Con clave temporal</span
              >
            </span>
          </div>
          <div class="people__actions">
            <select
              class="g-select people__role"
              :value="p.role"
              :disabled="p.username === me?.username || !p.active || busy === p.username"
              :aria-label="`Qué puede hacer ${p.name}`"
              @change="setRole(p, $event.target as HTMLSelectElement)"
            >
              <option value="editor">Edita</option>
              <option value="admin">Administra</option>
            </select>
            <template v-if="p.username !== me?.username">
              <button
                type="button"
                class="g-icon-btn"
                :disabled="!p.active || busy === p.username"
                :aria-label="`Clave temporal nueva para ${p.name}`"
                title="Clave temporal nueva"
                @click="newPassword(p)"
              >
                <ManagerIcon name="key" />
              </button>
              <button
                type="button"
                class="g-icon-btn"
                :disabled="busy === p.username"
                :aria-label="
                  p.active ? `Quitarle el acceso a ${p.name}` : `Devolverle el acceso a ${p.name}`
                "
                :title="p.active ? 'Quitar acceso' : 'Devolver acceso'"
                @click="toggleAccess(p)"
              >
                <ManagerIcon :name="p.active ? 'user-slash' : 'user-check'" />
              </button>
            </template>
          </div>
        </li>
      </ul>
      <p v-else-if="loading" class="people__loading">
        <ManagerIcon name="spinner" spin /> Cargando…
      </p>
    </div>
  </GDialog>
</template>

<style scoped>
.people {
  display: grid;
  gap: 14px;
}
.people__handout {
  align-items: flex-start;
}
.people__handout pre {
  margin: 8px 0;
  padding: 10px 12px;
  border-radius: 8px;
  background: var(--g-surface);
  color: var(--g-text);
  font: inherit;
  font-size: 13px;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.people__form {
  display: grid;
  gap: 12px;
  padding: 14px;
}
.people__fields {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 180px), 1fr));
  gap: 12px;
}
.people__fields .g-field + .g-field {
  margin-top: 0;
}
.people__form-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}
.people__add {
  justify-self: start;
}
.people__list {
  display: grid;
  margin: 0;
  padding: 0;
  list-style: none;
}
.people__list li {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 4px;
  border-bottom: 1px solid var(--g-line);
}
.people__list li.is-off .people__avatar,
.people__list li.is-off .people__who strong {
  opacity: 0.55;
}
.people__avatar {
  display: grid;
  flex: none;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--g-accent-soft);
  color: var(--g-accent);
  font-size: 13px;
  font-weight: 700;
}
.people__who {
  display: grid;
  flex: 1;
  min-width: 0;
  gap: 2px;
}
.people__who strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.people__me {
  color: var(--g-faint);
  font-weight: 400;
}
.people__meta {
  overflow: hidden;
  color: var(--g-faint);
  font-size: 12.5px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.people__badges:empty {
  display: none;
}
.people__actions {
  display: flex;
  flex: none;
  align-items: center;
  gap: 4px;
}
.people__role {
  width: auto;
  min-height: 32px;
  padding-block: 4px;
  font-size: 13px;
}
.people__loading {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--g-faint);
}
@media (max-width: 520px) {
  .people__list li {
    flex-wrap: wrap;
  }
  .people__actions {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>
