/**
 * El adorno de una ranura para un diseño alterno: el de la sección (o el que pone su tema);
 * si ninguno lo trae, el compartido (`fallback`, de themes/_shared/assets). `null` es que la
 * invitación lo quitó a propósito (imagen_<adorno> = ninguna): no se reemplaza.
 */
export function decorOr(
  decor: Record<string, string | null>,
  slot: string,
  fallback: string | null,
): string | null {
  return slot in decor ? (decor[slot] ?? null) : fallback
}
