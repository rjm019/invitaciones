import { computed, ref } from 'vue'
import * as managerService from '@/services/managerService'
import type { ManagerUser } from '@/types/design'
import { useManagerSession } from './useManagerSession'

/**
 * Las personas del gestor (solo las ve quien administra), una sola lista para toda la
 * página: "Datos generales" la pide la primera vez y después usa la que ya tiene; "Personas
 * del gestor" la vuelve a pedir al abrirse y la deja al día con lo que agrega o cambia. Si
 * entra otra persona en esta página, se pide otra vez.
 */
const people = ref<ManagerUser[] | null>(null)
let owner: string | null = null
let request: Promise<ManagerUser[]> | null = null

export function useManagerPeople() {
  const { user, withSession } = useManagerSession()

  /** La lista es de quien entró: con otra persona se olvida. */
  function ownedByMe(): void {
    const me = user.value?.username ?? null
    if (me !== owner) {
      owner = me
      people.value = null
      request = null
    }
  }

  /** La que ya se tiene o, si no hay (o con `fresh`), la del servidor. */
  async function load(fresh = false): Promise<ManagerUser[]> {
    ownedByMe()
    if (people.value && !fresh) return people.value
    if (!request || fresh) {
      const pending = withSession((t) => managerService.listUsers(t))
      request = pending
      pending.then(
        () => request === pending && (request = null),
        () => request === pending && (request = null),
      )
    }
    const list = await request
    people.value = list
    return list
  }

  /** Una persona nueva o con cambios (lo que respondió el servidor). */
  function put(person: ManagerUser): void {
    if (!people.value) return
    people.value = people.value.some((p) => p.username === person.username)
      ? people.value.map((p) => (p.username === person.username ? person : p))
      : [...people.value, person]
  }

  return { people: computed(() => people.value ?? []), load, put }
}
