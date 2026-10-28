import { onBeforeUnmount, ref, type Ref } from 'vue'
import { getDedicationWall, type WallEntry } from '@/services/dedicationWallService'

/**
 * El muro de dedicatorias de una invitación: `load()` lo pide (y vuelve a pedir tras
 * enviar una nueva). Una respuesta tardía de una petición anterior no pisa a la nueva, ni
 * llega después de desmontar.
 */
export function useDedicationWall(
  slug: () => string,
  token: () => string | undefined,
): { entries: Ref<WallEntry[]>; load: () => Promise<void> } {
  const entries = ref<WallEntry[]>([])
  let latest = 0
  let alive = true
  onBeforeUnmount(() => {
    alive = false
  })

  async function load(): Promise<void> {
    const mine = ++latest
    const list = await getDedicationWall(slug(), token())
    if (alive && mine === latest) entries.value = list
  }

  return { entries, load }
}
