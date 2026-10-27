/**
 * Álbum de los invitados, sin Vue ni DOM. `albumWindow` es el espejo de `AlbumService::window`
 * del servidor (misma regla, en la zona del evento): solo sirve para pintar la interfaz; quien
 * decide si se puede subir, cuántas fotos caben y cuándo se cierra es siempre la API.
 */
import { localDate } from './calendarService'
import { isHeic, targetSize } from './imageResizeService'
import type { GalleryPhoto } from '@/types/event'
import type { InvitationAlbum } from '@/types/invitation'

/** Fotos por invitación. */
export const ALBUM_PER_INVITATION = 2
/** Lado mayor al que el celular reduce la foto antes de subirla. */
export const ALBUM_SIDE = 1600
export const ALBUM_QUALITY = 0.85
export const ALBUM_MIN_DAYS = 5
export const ALBUM_MAX_DAYS = 20
/** Lo que el servidor rechaza sin procesar. */
export const ALBUM_MAX_BYTES = 8 * 1024 * 1024

export const ENDED_MESSAGE = 'Este evento ya terminó. ¡Gracias por acompañarnos!'

/**
 * before: aún no es el día · event_day: se sube · after: del día siguiente al último día, se
 * sigue subiendo y se ve el álbum · closed: ya se borró.
 */
export type AlbumState = 'before' | 'event_day' | 'after' | 'closed'

export interface AlbumWindow {
  state: AlbumState
  /** 'AAAA-MM-DD' del día del evento. */
  eventDay: string
  /** 'AAAA-MM-DD' del último día (se borra al terminar). */
  lastDay: string
}

/** `album_dias` acotado a 5–20 (vacío o inválido: 5). */
export function clampAlbumDays(value: unknown): number {
  const n = typeof value === 'string' ? Number(value) : value
  if (typeof n !== 'number' || !Number.isFinite(n)) return ALBUM_MIN_DAYS
  return Math.max(ALBUM_MIN_DAYS, Math.min(ALBUM_MAX_DAYS, Math.trunc(n)))
}

function ymd(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10)
}

/** El calendario del álbum en la zona del evento; null si no se sabe cuándo es. */
export function albumWindow(
  startsAt: string | null | undefined,
  timeZone: string,
  days: number,
  now: Date | number = Date.now(),
): AlbumWindow | null {
  if (!startsAt) return null
  const eventDay = localDate(startsAt, timeZone)
  const today = localDate(new Date(now).toISOString(), timeZone)
  const day0 = Date.UTC(eventDay.year, eventDay.month - 1, eventDay.day)
  const diff = Math.round((Date.UTC(today.year, today.month - 1, today.day) - day0) / 86_400_000)
  const n = clampAlbumDays(days)
  const state: AlbumState =
    diff < 0 ? 'before' : diff === 0 ? 'event_day' : diff <= n ? 'after' : 'closed'
  return { state, eventDay: ymd(day0), lastDay: ymd(day0 + n * 86_400_000) }
}

/** Qué pinta la sección. */
export type AlbumMode = 'before' | 'upload' | 'closed'

export interface AlbumView {
  mode: AlbumMode
  /** Se puede subir ahora (el servidor lo confirma al subir). */
  canUpload: boolean
  /** Lugares que le quedan a este enlace. */
  remaining: number
  /** Se muestran las fotos elegidas (del día siguiente al evento en adelante). */
  showPhotos: boolean
}

/**
 * Estado de la sección. Con la invitación personal manda lo que dijo el servidor; en la
 * invitación general (sin enlace) solo se muestra el álbum. Una muestra (demo) siempre está
 * "después": se ven las fotos de ejemplo y la subida se simula.
 */
export function albumView(input: {
  window: AlbumWindow | null
  server: InvitationAlbum | null | undefined
  hasInvitation: boolean
  demo: boolean
  simulatedUsed: number
}): AlbumView {
  const state: AlbumState = input.demo
    ? 'after'
    : ((input.server?.state as AlbumState | undefined) ?? input.window?.state ?? 'before')
  if (state === 'closed')
    return { mode: 'closed', canUpload: false, remaining: 0, showPhotos: false }
  if (state === 'before')
    return { mode: 'before', canUpload: false, remaining: ALBUM_PER_INVITATION, showPhotos: false }
  const remaining = input.demo
    ? Math.max(0, ALBUM_PER_INVITATION - input.simulatedUsed)
    : (input.server?.remaining ?? (input.hasInvitation ? ALBUM_PER_INVITATION : 0))
  return {
    mode: 'upload',
    canUpload: input.hasInvitation && remaining > 0,
    remaining,
    showPhotos: state === 'after',
  }
}

/** "Sube tus fotos (te quedan 2)". */
export function uploadTitle(remaining: number): string {
  if (remaining <= 0) return '¡Gracias por tus fotos!'
  return `Sube tus fotos (te ${remaining === 1 ? 'queda 1' : `quedan ${remaining}`})`
}

export const BEFORE_TEXT = 'El día de la fiesta podrás subir tus fotos aquí'

/** Fotos del servidor que ya se pueden mostrar (con su URL y su forma). */
export function albumPhotos(photos: GalleryPhoto[] | undefined): GalleryPhoto[] {
  return (photos ?? []).filter((p) => p.photo.trim() !== '')
}

/** ¿El archivo es una imagen que se puede intentar subir? (el celular a veces no pone el tipo) */
export function isImageFile(file: { type: string; name?: string }): boolean {
  return (
    file.type.startsWith('image/') || isHeic(file) || /\.(jpe?g|png|webp)$/i.test(file.name ?? '')
  )
}

/** Medidas de la foto ya reducida para subirla (lado mayor de 1600 px). */
export function albumTarget(width: number, height: number): { width: number; height: number } {
  return targetSize(width, height, ALBUM_SIDE)
}

/** "Foto.HEIC" → "Foto.jpg" (siempre se sube como JPEG). */
export function albumFileName(name: string): string {
  const base = name.replace(/\.[^.]+$/, '') || 'foto'
  return `${base}.jpg`
}

/** El mensaje para el invitado a partir del error de la API (o uno propio si no hay). */
export function albumErrorMessage(status: number, message: string): string {
  if (status === 410) return ENDED_MESSAGE
  if (status === 429) return 'Estás subiendo muy rápido. Espera un minuto e inténtalo de nuevo.'
  if (status === 507) return message || 'El álbum ya está lleno y no recibe más fotos.'
  if (status === 0) return 'No hay conexión. Revisa tu internet e inténtalo de nuevo.'
  return message || 'No se pudo subir la foto. Inténtalo de nuevo.'
}

/** 1.5 KB → "2 KB"; 42 MB → "42 MB"; 1.2 GB → "1.2 GB". */
export function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(0, Math.round(bytes / 1024))} KB`
  if (bytes < 1024 ** 3) return `${Math.round(bytes / 1024 ** 2)} MB`
  return `${(bytes / 1024 ** 3).toFixed(1)} GB`
}

/** "42 MB de 300 MB". */
export function usageLabel(usedBytes: number, maxBytes: number): string {
  return `${formatBytes(usedBytes)} de ${formatBytes(maxBytes)}`
}

/** Aviso del panel al llegar al 80 % del tope; '' si todavía hay espacio de sobra. */
export function usageWarning(percent: number): string {
  if (percent >= 100)
    return 'El álbum está lleno: ya no recibe más fotos. Rechaza las que no quieras para liberar espacio.'
  if (percent >= 80)
    return `El álbum va en ${percent} % de su espacio. Rechaza las que no quieras para dejar lugar a más fotos.`
  return ''
}
