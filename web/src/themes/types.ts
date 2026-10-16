import type {
  ButtonStyle,
  CornerStyle,
  DecorSprite,
  DesktopWidth,
  EdgeStyle,
  SectionBackground,
} from '@/types/event'

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
  /**
   * Color propio del panel (un token, p. ej. "panel-pearl"). La sección toma su turno en
   * la rotación de `panels`, así los fondos de las demás no se recorren.
   */
  panelColor?: string
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
  /** Nombre para el editor del gestor ("Jardín azul"). */
  label?: string
  /** Tema de fondo oscuro: el panel del dueño y la tarjeta para compartir van en su versión oscura. */
  dark?: boolean
  /** Rol tipográfico → fuente por defecto (el layout puede sobrescribirla en la pestaña tipografia). */
  fonts: Record<string, ThemeFont>
  /** Fondo de toda la página (debajo de las secciones). */
  page?: SectionBackground
  /** Decoraciones flotantes de toda la página. */
  floating?: FloatingDecorItem[]
  /** Decoraciones que cruzan la pantalla (también en el celular). */
  flights?: FlightItem[]
  /**
   * Confeti de papel metálico que cae despacio por toda la pantalla (con los colores de la
   * paleta). count: cuántos pedacitos a la vez. La invitación lo puede apagar o encender.
   */
  confetti?: { count?: number }
  /**
   * Lo que el tema pone por defecto en los detalles que la invitación también puede elegir
   * (bloque "pagina"): la orilla de las franjas (`default`, o por color de fondo: `paper`,
   * `frame`…), el estilo de los botones, los títulos con brillo de metal y las esquinas de
   * los paneles.
   */
  edges?: { default?: EdgeStyle } & Record<string, EdgeStyle | undefined>
  buttons?: ButtonStyle
  metallic?: boolean
  corners?: CornerStyle
  /**
   * Fondos que se turnan los paneles sin fondo propio (en el layout o en el tema), para
   * que dos secciones seguidas no se vean iguales.
   */
  panels?: SectionBackground[]
  /** Defaults por tipo de sección. */
  sections: Record<string, ThemeSectionDefaults>
}
