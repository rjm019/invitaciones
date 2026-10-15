<script setup lang="ts">
import { ref } from 'vue'
import { useManagerSession } from '@/composables/useManagerSession'
import { initials } from '@/services/managerAccountService'
import GPopover from './GPopover.vue'
import ManagerIcon from './ManagerIcon.vue'
import PasswordDialog from './PasswordDialog.vue'
import PeopleDialog from './PeopleDialog.vue'

/** Quién entró: cambiar mi clave, las personas del gestor (si administra) y salir. */
const { user, isAdmin, logout } = useManagerSession()
const anchor = ref<HTMLButtonElement | null>(null)
const open = ref(false)
const dialog = ref<'password' | 'people' | null>(null)

function show(which: 'password' | 'people'): void {
  open.value = false
  dialog.value = which
}
</script>

<template>
  <div v-if="user" class="account">
    <button
      ref="anchor"
      type="button"
      class="g-btn g-btn--ghost account__button"
      :aria-expanded="open"
      aria-haspopup="menu"
      @click="open = !open"
    >
      <span class="account__avatar" aria-hidden="true">{{ initials(user.name) }}</span>
      <span class="account__name">{{ user.name }}</span>
      <ManagerIcon name="chevron-down" />
    </button>
    <GPopover :open="open" :anchor="anchor" :width="250" align="end" @close="open = false">
      <div class="account__head">
        <strong>{{ user.name }}</strong>
        <span>{{ user.username }} · {{ user.role === 'admin' ? 'Administra' : 'Edita' }}</span>
      </div>
      <div class="account__menu" role="menu">
        <button type="button" role="menuitem" @click="show('password')">
          <ManagerIcon name="key" /> Cambiar mi clave
        </button>
        <button v-if="isAdmin" type="button" role="menuitem" @click="show('people')">
          <ManagerIcon name="users" /> Personas del gestor
        </button>
        <button type="button" role="menuitem" @click="logout()">
          <ManagerIcon name="arrow-right-from-bracket" /> Salir
        </button>
      </div>
    </GPopover>
    <PasswordDialog :open="dialog === 'password'" @close="dialog = null" />
    <PeopleDialog v-if="isAdmin" :open="dialog === 'people'" @close="dialog = null" />
  </div>
</template>

<style scoped>
.account__button {
  gap: 8px;
  padding-inline: 6px 10px;
}
.account__avatar {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--g-accent-soft);
  color: var(--g-accent);
  font-size: 12px;
  font-weight: 700;
}
.account__name {
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.account__head {
  display: grid;
  gap: 2px;
  padding: 4px 8px 10px;
  border-bottom: 1px solid var(--g-line);
}
.account__head span {
  color: var(--g-faint);
  font-size: 12.5px;
}
.account__menu {
  display: grid;
  padding-top: 6px;
}
.account__menu button {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 8px;
  border: 0;
  border-radius: 8px;
  background: none;
  color: var(--g-text);
  font: inherit;
  text-align: left;
  cursor: pointer;
}
.account__menu button:hover,
.account__menu button:focus-visible {
  background: var(--g-surface-2);
}
@media (max-width: 560px) {
  .account__name {
    display: none;
  }
}
</style>
