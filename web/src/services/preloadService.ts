import type { ResolvedSection } from '@/types/event'
import type { ThemeFont } from '@/themes/types'

/**
 * Lo que tiene que estar listo antes de mostrar la invitación, para que aparezca completa
 * y no armándose frente al invitado: las imágenes de lo primero que se ve (la portada y el
 * papel) y las fuentes del tema. Lo de abajo carga después, mientras se ve el sobre.
 */
export function criticalImages(
  first: Pick<ResolvedSection, 'decor'> | undefined,
  extra: (string | null | undefined)[] = [],
): string[] {
  const urls = [...extra, ...(first ? Object.values(first.decor) : [])]
  return [...new Set(urls.filter((u): u is string => !!u))]
}

/** Familias de fuentes del tema (con lo que cambie el layout), sin repetir. */
export function fontFamilies(fonts: Record<string, ThemeFont>): string[] {
  return [
    ...new Set(
      Object.values(fonts)
        .map((f) => f.family.trim())
        .filter(Boolean),
    ),
  ]
}
