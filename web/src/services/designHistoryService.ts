/**
 * Deshacer y rehacer en el editor. Guarda versiones completas de la invitación (son
 * chicas) y junta en un solo paso lo que se escribe seguido en el mismo campo: deshacer
 * quita la palabra, no letra por letra.
 */
export interface History<T> {
  past: T[]
  present: T
  future: T[]
  /** Campo del último cambio y cuándo fue (para juntar lo que se escribe seguido). */
  lastKey: string | null
  lastAt: number
}

export const HISTORY_LIMIT = 50
export const COALESCE_MS = 1000

export function createHistory<T>(present: T): History<T> {
  return { past: [], present, future: [], lastKey: null, lastAt: 0 }
}

/**
 * Un cambio nuevo. Con la misma `key` en menos de un segundo, reemplaza al anterior en vez
 * de sumar un paso. Un cambio nuevo borra lo que se podía rehacer.
 */
export function record<T>(
  history: History<T>,
  next: T,
  key: string | null,
  now: number,
): History<T> {
  const coalesce = key !== null && key === history.lastKey && now - history.lastAt < COALESCE_MS
  return {
    past: coalesce ? history.past : [...history.past, history.present].slice(-HISTORY_LIMIT),
    present: next,
    future: [],
    lastKey: key,
    lastAt: now,
  }
}

export function undo<T>(history: History<T>): History<T> {
  if (!history.past.length) return history
  return {
    past: history.past.slice(0, -1),
    present: history.past[history.past.length - 1],
    future: [history.present, ...history.future],
    lastKey: null,
    lastAt: 0,
  }
}

export function redo<T>(history: History<T>): History<T> {
  if (!history.future.length) return history
  return {
    past: [...history.past, history.present],
    present: history.future[0],
    future: history.future.slice(1),
    lastKey: null,
    lastAt: 0,
  }
}

export const canUndo = (history: History<unknown>) => history.past.length > 0
export const canRedo = (history: History<unknown>) => history.future.length > 0
