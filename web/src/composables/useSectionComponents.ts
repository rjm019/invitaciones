import { computed, shallowRef, watch, type Component } from 'vue'
import { sectionRegistry } from '@/components/sectionRegistry'
import { sectionVariants } from '@/components/sectionVariants'

type Loader = () => Promise<{ default: Component }>
interface Needs {
  type: string
  variant?: string | null
}

const keyOf = (s: Needs) => `${s.type}:${s.variant ?? ''}`

/**
 * El componente de cada sección: su diseño alterno si pide uno (se descarga una vez) o el
 * de siempre. `ready` dice si ya están todos los que la invitación necesita: así no se
 * muestra con una sección "a medias". Si una descarga falla, esa sección usa el de siempre.
 */
export function useSectionComponents(
  sections: () => Needs[],
  variants: Record<string, Record<string, Loader>> = sectionVariants,
  base: Record<string, Component> = sectionRegistry,
) {
  /** tipo:variante → componente (null: no tiene diseño alterno o no se pudo descargar). */
  const loaded = shallowRef<Record<string, Component | null>>({})
  const asked = new Set<string>()

  const needed = computed(() =>
    [...new Set(sections().map(keyOf))].filter((k) => {
      const [type, variant] = k.split(':')
      return !!variant && !!variants[type]?.[variant]
    }),
  )

  watch(
    needed,
    (keys) => {
      for (const key of keys) {
        if (asked.has(key)) continue
        asked.add(key)
        const [type, variant] = key.split(':')
        variants[type]![variant]!()
          .then((m) => m.default)
          .catch(() => null)
          .then((component) => (loaded.value = { ...loaded.value, [key]: component }))
      }
    },
    { immediate: true },
  )

  const ready = computed(() => needed.value.every((k) => k in loaded.value))

  function componentFor(section: Needs): Component | undefined {
    return loaded.value[keyOf(section)] ?? base[section.type]
  }

  return { ready, componentFor }
}
