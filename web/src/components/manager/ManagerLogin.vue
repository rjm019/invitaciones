<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useManagerSession } from '@/composables/useManagerSession'
import { MIN_PASSWORD, suggestUsername } from '@/services/managerAccountService'
import * as managerService from '@/services/managerService'
import ManagerIcon from './ManagerIcon.vue'

/**
 * Entrada al gestor. Según el servidor y la sesión:
 * - apagado (sin GESTOR_CLAVE): lo dice;
 * - sin cuentas todavía: crear la primera, con la clave maestra;
 * - entrar con usuario y clave;
 * - quien entró con una clave temporal elige la suya antes de seguir.
 */
const { login, setup, changePassword, logout, message, mustChangePassword, user } =
  useManagerSession()

type Mode = 'loading' | 'disabled' | 'setup' | 'login' | 'choose'
const status = ref<'loading' | 'disabled' | 'setup' | 'ready'>('loading')
const mode = computed<Mode>(() => {
  if (mustChangePassword.value) return 'choose'
  return status.value === 'ready' ? 'login' : status.value
})

const username = ref('')
const password = ref('')
const temporary = ref('')
const fresh = ref('')
const master = ref('')
const name = ref('')
const nameTouchedUser = ref(false)
const show = ref(false)
const error = ref('')
const field = ref<string | null>(null)
const busy = ref(false)

async function loadStatus(): Promise<void> {
  try {
    const s = await managerService.getStatus()
    status.value = !s.enabled ? 'disabled' : s.setup ? 'setup' : 'ready'
  } catch {
    // Sin respuesta: se intenta entrar y el servidor dirá qué pasa.
    status.value = 'ready'
  }
}
onMounted(loadStatus)

// En la primera cuenta, el usuario se propone solo con el nombre (hasta que lo escriban).
watch(name, (value) => {
  if (!nameTouchedUser.value) username.value = suggestUsername(value)
})

function fail(e: unknown, fallback: string): void {
  error.value = e instanceof Error ? e.message : fallback
  const errors = (e as { errors?: Record<string, string[]> }).errors
  field.value = errors ? (Object.keys(errors)[0] ?? null) : null
}

async function run(task: () => Promise<void>, fallback: string): Promise<void> {
  busy.value = true
  error.value = ''
  field.value = null
  try {
    await task()
  } catch (e) {
    fail(e, fallback)
  } finally {
    busy.value = false
  }
}

function submitLogin(): Promise<void> | void {
  if (!username.value.trim() || !password.value) {
    error.value = 'Escribe tu usuario y tu clave.'
    return
  }
  return run(async () => {
    await login(username.value, password.value)
    // Con clave temporal sigue "Elige tu clave" y ya no hay que volver a escribirla.
    temporary.value = password.value
    password.value = ''
  }, 'No se pudo entrar.')
}

function submitSetup(): Promise<void> | void {
  if (!master.value || !name.value.trim() || !username.value.trim() || !password.value) {
    error.value = 'Llena los cuatro datos.'
    return
  }
  return run(async () => {
    await setup({
      master_password: master.value,
      name: name.value.trim(),
      username: username.value.trim(),
      password: password.value,
    })
    master.value = ''
    password.value = ''
  }, 'No se pudo crear la cuenta.')
}

function submitChoose(): Promise<void> | void {
  if (!temporary.value || !fresh.value) {
    error.value = 'Escribe tu clave temporal y la nueva.'
    return
  }
  return run(async () => {
    await changePassword(temporary.value, fresh.value)
    temporary.value = ''
    fresh.value = ''
  }, 'No se pudo cambiar la clave.')
}

function useOtherAccount(): void {
  temporary.value = ''
  fresh.value = ''
  error.value = ''
  logout()
}

const invalid = (name: string) => (field.value === name ? 'true' : undefined)
</script>

<template>
  <div class="login">
    <div class="login__card g-card">
      <div class="login__mark" aria-hidden="true"><ManagerIcon name="envelope" /></div>

      <p v-if="mode === 'loading'" class="login__loading" aria-busy="true">
        <ManagerIcon name="spinner" spin /> Un momento…
      </p>

      <template v-else-if="mode === 'disabled'">
        <h1>Gestor de invitaciones</h1>
        <p class="g-note g-note--warn">
          <ManagerIcon name="lock" />
          El gestor no está activado. Falta la clave maestra GESTOR_CLAVE (16 caracteres o más) en
          el servidor.
        </p>
      </template>

      <form v-else-if="mode === 'setup'" class="login__form" @submit.prevent="submitSetup">
        <h1>Crea la primera cuenta</h1>
        <p class="login__lead">
          Es la tuya y podrá agregar a las demás personas. La clave maestra solo se pide esta vez.
        </p>
        <div class="g-field">
          <label class="g-label" for="setup-master">Clave maestra (GESTOR_CLAVE)</label>
          <input
            id="setup-master"
            v-model="master"
            class="g-input"
            type="password"
            autocomplete="off"
            :aria-invalid="invalid('master_password')"
            autofocus
          />
        </div>
        <div class="g-field">
          <label class="g-label" for="setup-name">Tu nombre</label>
          <input
            id="setup-name"
            v-model="name"
            class="g-input"
            autocomplete="name"
            maxlength="60"
            :aria-invalid="invalid('name')"
          />
        </div>
        <div class="g-field">
          <label class="g-label" for="setup-user">Usuario</label>
          <input
            id="setup-user"
            v-model="username"
            class="g-input"
            autocomplete="username"
            autocapitalize="none"
            spellcheck="false"
            maxlength="60"
            :aria-invalid="invalid('username')"
            @input="nameTouchedUser = true"
          />
          <p class="g-help">Con él entras. Minúsculas y números; también sirve tu correo.</p>
        </div>
        <div class="g-field">
          <label class="g-label" for="setup-password">Tu clave</label>
          <div class="login__password">
            <input
              id="setup-password"
              v-model="password"
              class="g-input"
              :type="show ? 'text' : 'password'"
              autocomplete="new-password"
              :aria-invalid="invalid('password')"
            />
            <button
              type="button"
              class="g-icon-btn"
              :aria-label="show ? 'Ocultar clave' : 'Ver clave'"
              @click="show = !show"
            >
              <ManagerIcon :name="show ? 'eye-slash' : 'eye'" />
            </button>
          </div>
          <p class="g-help">Al menos {{ MIN_PASSWORD }} caracteres.</p>
        </div>
        <p v-if="error" class="g-error" role="alert">{{ error }}</p>
        <button
          type="submit"
          class="g-btn g-btn--primary g-btn--block login__submit"
          :disabled="busy"
        >
          <ManagerIcon v-if="busy" name="spinner" spin />
          {{ busy ? 'Creando…' : 'Crear mi cuenta y entrar' }}
        </button>
      </form>

      <form v-else-if="mode === 'choose'" class="login__form" @submit.prevent="submitChoose">
        <h1>Elige tu clave</h1>
        <p class="login__lead">
          Hola, {{ user?.name }}. Entraste con una clave temporal: cámbiala por una que solo tú
          sepas.
        </p>
        <div v-if="!temporary || field === 'current_password'" class="g-field">
          <label class="g-label" for="choose-temporary">Clave temporal</label>
          <input
            id="choose-temporary"
            v-model="temporary"
            class="g-input"
            type="password"
            autocomplete="current-password"
            :aria-invalid="invalid('current_password')"
          />
        </div>
        <div class="g-field">
          <label class="g-label" for="choose-password">Tu clave nueva</label>
          <div class="login__password">
            <input
              id="choose-password"
              v-model="fresh"
              class="g-input"
              :type="show ? 'text' : 'password'"
              autocomplete="new-password"
              :aria-invalid="invalid('password')"
              autofocus
            />
            <button
              type="button"
              class="g-icon-btn"
              :aria-label="show ? 'Ocultar clave' : 'Ver clave'"
              @click="show = !show"
            >
              <ManagerIcon :name="show ? 'eye-slash' : 'eye'" />
            </button>
          </div>
          <p class="g-help">Al menos {{ MIN_PASSWORD }} caracteres.</p>
        </div>
        <p v-if="error" class="g-error" role="alert">{{ error }}</p>
        <button
          type="submit"
          class="g-btn g-btn--primary g-btn--block login__submit"
          :disabled="busy"
        >
          <ManagerIcon v-if="busy" name="spinner" spin />
          {{ busy ? 'Guardando…' : 'Guardar y entrar' }}
        </button>
        <button type="button" class="g-btn g-btn--ghost g-btn--small" @click="useOtherAccount">
          Entrar con otra cuenta
        </button>
      </form>

      <form v-else class="login__form" @submit.prevent="submitLogin">
        <h1>Gestor de invitaciones</h1>
        <p class="login__lead">Diseña, publica y comparte las invitaciones de tus eventos.</p>

        <p v-if="message" class="g-note g-note--warn">
          <ManagerIcon name="lock" />
          {{ message }}
        </p>

        <div class="g-field">
          <label class="g-label" for="manager-user">Usuario</label>
          <input
            id="manager-user"
            v-model="username"
            class="g-input"
            autocomplete="username"
            autocapitalize="none"
            spellcheck="false"
            :aria-invalid="error ? 'true' : undefined"
            autofocus
          />
        </div>
        <div class="g-field">
          <label class="g-label" for="manager-password">Clave</label>
          <div class="login__password">
            <input
              id="manager-password"
              v-model="password"
              class="g-input"
              :type="show ? 'text' : 'password'"
              autocomplete="current-password"
              :aria-invalid="error ? 'true' : undefined"
              aria-describedby="manager-password-error"
            />
            <button
              type="button"
              class="g-icon-btn"
              :aria-label="show ? 'Ocultar clave' : 'Ver clave'"
              @click="show = !show"
            >
              <ManagerIcon :name="show ? 'eye-slash' : 'eye'" />
            </button>
          </div>
          <p v-if="error" id="manager-password-error" class="g-error" role="alert">{{ error }}</p>
        </div>

        <button
          type="submit"
          class="g-btn g-btn--primary g-btn--block login__submit"
          :disabled="busy"
        >
          <ManagerIcon v-if="busy" name="spinner" spin />
          {{ busy ? 'Entrando…' : 'Entrar' }}
        </button>
        <p class="g-help login__forgot">
          ¿Olvidaste tu clave? Pídele a quien administra el gestor una temporal.
        </p>
      </form>
    </div>
  </div>
</template>

<style scoped>
.login {
  display: grid;
  place-items: center;
  min-height: 100vh;
  padding: 24px 16px;
  background:
    radial-gradient(60% 50% at 20% 0%, #e0e7ff 0%, transparent 70%),
    radial-gradient(50% 50% at 100% 100%, #fde7f3 0%, transparent 70%), var(--g-bg);
}
.login__card {
  display: grid;
  gap: 14px;
  width: min(400px, 100%);
  padding: 32px 28px 28px;
}
.login__form {
  display: grid;
  gap: 14px;
}
.login__mark {
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  border-radius: 14px;
  background: linear-gradient(135deg, #6366f1, #a855f7);
  color: #fff;
  font-size: 20px;
  box-shadow: 0 8px 20px rgb(99 102 241 / 0.35);
}
.login h1 {
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -0.01em;
}
.login__lead {
  color: var(--g-muted);
}
.login__loading {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--g-faint);
}
.login__password {
  display: flex;
  gap: 6px;
}
.login__submit {
  min-height: 42px;
  margin-top: 6px;
}
.login__forgot {
  text-align: center;
}
.login__form .g-field + .g-field {
  margin-top: 0;
}
</style>
