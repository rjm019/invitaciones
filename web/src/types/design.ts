/**
 * La invitación en el formato nuevo (invitacion.csv) tal como la edita el gestor, y el
 * catálogo que dice qué se puede poner en ella. Contrato de /api/manager (ver
 * api/app/Services/Design/Design.php y Catalog.php). Las claves de los datos van en
 * español porque son las del CSV que la persona puede abrir en Excel.
 */
import type { EventConfig } from './event'

export type DesignValues = Record<string, string>

export interface DesignSection {
  /** "itinerario", "frase-2". */
  id: string
  fields: DesignValues
  items: DesignValues[]
}

export interface Design {
  event: DesignValues
  colors: DesignValues
  fonts: DesignValues
  texts: DesignValues
  page: DesignValues
  sections: DesignSection[]
}

/** Algo que revisar, con el lugar exacto (bloque o sección, elemento y campo). */
export interface DesignIssue {
  level: 'error' | 'warning'
  block: string
  item: number | null
  field: string | null
  message: string
}

export type FieldInput =
  | 'text'
  | 'textarea'
  | 'lines'
  | 'datetime'
  | 'date'
  | 'time'
  | 'url'
  | 'phone'
  | 'range'
  | 'toggle'
  | 'select'
  | 'chips'
  | 'color'
  | 'colors'
  | 'image'
  | 'audio'
  | 'icon'
  | 'font'
  | 'timezone'
  | 'theme'

export interface FieldOption {
  value: string
  label: string
}

export interface FieldDef {
  key: string
  label: string
  input: FieldInput
  help?: string
  placeholder?: string
  options?: FieldOption[]
  min?: number
  max?: number
  step?: number
  max_length?: number
  required?: boolean
  hidden?: boolean
}

export interface CatalogList {
  key: string
  label: string
  item_label: string
  max: number
  help?: string
  fields: FieldDef[]
}

export interface CatalogSection {
  /** Nombre en el CSV ("itinerario"). */
  id: string
  /** Tipo del contrato ("itinerary"). */
  type: string
  label: string
  description: string
  icon: string
  repeatable: boolean
  fields: FieldDef[]
  list: CatalogList | null
  /** Claves de "evento" que se editan dentro de esta sección (el salón en Ubicación…). */
  linked: string[]
  /** Adornos del tema que se pueden cambiar: nombre en el CSV → ranura del componente. */
  slots: { key: string; slot: string; label: string }[]
  /** Bloques de texto: nombre en el CSV → bloque del contrato. */
  texts: { key: string; block: string; label: string }[]
  hidden_without: string | null
}

export interface Catalog {
  version: number
  reserved: string[]
  event_groups: { label: string; fields: FieldDef[] }[]
  colors: { key: string; token: string; label: string; help: string }[]
  fonts: { key: string; role: string; label: string; help: string }[]
  texts: { key: string; block: string; label: string }[]
  text_props: {
    key: 'fuente' | 'color' | 'tamano'
    prop: 'font' | 'color' | 'size'
    label: string
  }[]
  text_size: { min: number; max: number }
  common: FieldDef[]
  effects: { key: string; effect: string; label: string; help: string }[]
  page: FieldDef[]
  sections: CatalogSection[]
  no_image: string
  limits: { sections: number; fields: number; items: number; value: number }
}

/** Una tarjeta del inicio del gestor. */
export interface ManagerEvent {
  slug: string
  title: string
  type: string
  celebrant: string | null
  starts_at: string | null
  published: boolean
  template: boolean
  format: 'design' | 'legacy'
  has_draft: boolean
  pending: boolean
  updated_at: string | null
  cover: {
    theme: string | null
    colors: Partial<Record<'bg' | 'primary' | 'accent' | 'text', string>>
    font: string | null
  }
  counts: { invitations: number; guests: number; attending: number }
  error?: string
}

export interface ManagerSettings {
  published: boolean
  template: boolean
  panel_password: string | null
  /** Fecha límite que el dueño movió desde su panel (gana sobre la invitación). */
  owner_deadline: string | null
  deadline_changes: number
}

export interface DesignChange {
  type: 'block' | 'section' | 'order'
  key: string | null
  change: 'added' | 'removed' | 'changed'
}

/** Lo que el editor recibe después de guardar. */
export interface DesignBuild {
  version: string
  has_draft: boolean
  pending: boolean
  changes: DesignChange[]
  config: EventConfig
  issues: DesignIssue[]
  brand: Record<string, unknown>
}

/** Lo que el editor recibe al abrir una invitación. */
export interface DesignPayload extends DesignBuild {
  slug: string
  design: Design
  source: 'draft' | 'live' | 'legacy'
  warnings: string[]
  settings: ManagerSettings
  conversion: { identical: boolean; differences: string[]; errors: string[] } | null
}

export interface MediaFile {
  name: string
  url: string
  kind: 'image' | 'audio'
  bytes: number
  width: number | null
  height: number | null
  modified: number
  used_in: { version: string; block: string; item: number | null; field: string }[]
}

export interface HistoryVersion {
  id: string
  published_at: string
  bytes: number
}
