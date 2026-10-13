import type { DecorSprite, DesktopWidth, SectionBackground } from '@/types/event'

export interface ThemeFont {
  family: string
  /** Pesos disponibles en Google Fonts; omitir si la fuente solo tiene 400. */
  weights?: number[]
}

export interface ThemeSectionDefaults {
  variant?: string
  background?: SectionBackground
  effects?: string[]
  /** Ancho en escritorio si el layout no dice otra cosa (por defecto, toda la fila). */
  desktop?: DesktopWidth
  /** Ranura de decoración → nombre de archivo (se busca en media del evento y luego en assets del tema). */
  decor?: Record<string, string>
  /** Ranura de decoración → figuras de su imagen, para animarlas por separado. */
  sprites?: Record<string, DecorSprite>
  /** false = sin panel: la sección va directo sobre el papel (la portada). */
  panel?: boolean
}

/** Decoración que flota en las orillas de la página (mariposas, corazones…). */
export interface FloatingDecorItem {
  file: string
  /** Altura en la página, en % del alto total ("40%"). */
  top: string
  side: 'left' | 'right'
  /** Ancho (por ejemplo "1.6rem"). */
  size: string
  /** Voltear horizontalmente para que mire hacia el otro lado. */
  flip?: boolean
}

/** Decoración que cruza la pantalla de vez en cuando (mariposas en vuelo). */
export interface FlightItem {
  file: string
  /** Ancho (por ejemplo "1.6rem"). */
  size: string
  /** ltr = de izquierda a derecha. */
  direction: 'ltr' | 'rtl'
  /** Segundos de cada ciclo (vuela el 40 % y espera el resto). */
  duration: number
  /** Segundos antes del primer vuelo. */
  delay: number
  /** Voltear la imagen para que mire hacia donde vuela. */
  flip?: boolean
}

export interface ThemeManifest {
  id: string
  /** Rol tipográfico → fuente por defecto (el layout puede sobrescribirla en la pestaña tipografia). */
  fonts: Record<string, ThemeFont>
  /** Fondo de toda la página (debajo de las secciones). */
  page?: SectionBackground
  /** Decoraciones flotantes de toda la página. */
  floating?: FloatingDecorItem[]
  /** Decoraciones que cruzan la pantalla (también en el celular). */
  flights?: FlightItem[]
  /**
   * Fondos que se turnan los paneles sin fondo propio (en el layout o en el tema), para
   * que dos secciones seguidas no se vean iguales.
   */
  panels?: SectionBackground[]
  /** Defaults por tipo de sección. */
  sections: Record<string, ThemeSectionDefaults>
}
