/**
 * Cuentas del gestor: lo que se arma en el navegador (sin llamar al servidor). El usuario
 * que se propone para una persona nueva, el mensaje con su acceso, sus iniciales y cómo
 * se dice quién publicó una versión.
 */

/** Mismo patrón que el servidor: minúsculas, números y . _ @ - (de 3 a 60). */
export const USERNAME_PATTERN = /^[a-z0-9][a-z0-9._@-]{2,59}$/

export const MIN_PASSWORD = 10

function plain(word: string): string {
  return word
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

/** "Ana María López" → "ana"; si ya existe, "ana.m", "ana2"… */
export function suggestUsername(name: string, taken: string[] = []): string {
  const words = name.split(/\s+/).map(plain).filter(Boolean)
  if (!words.length) return ''
  const used = new Set(taken.map((t) => t.toLowerCase()))
  const [first, second] = words as [string, string | undefined]
  const options = [first, ...(second ? [`${first}.${second[0]}`] : [])].filter((u) =>
    USERNAME_PATTERN.test(u),
  )
  // Un nombre muy corto ("Bo") no alcanza para un usuario: se completa.
  if (!options.length) options.push(first.padEnd(3, '0'))
  const free = options.find((u) => !used.has(u))
  if (free) return free
  const base = options[0]!
  for (let n = 2; ; n++) {
    if (!used.has(`${base}${n}`)) return `${base}${n}`
  }
}

/**
 * Lo que se le manda a la persona (por WhatsApp o como sea) para que entre. Con una clave
 * temporal, le avisa que al entrar elige la suya.
 */
export function accessMessage(
  url: string,
  username: string,
  password: string,
  temporary = true,
): string {
  return [
    'Ya tienes cuenta en el gestor de invitaciones:',
    url,
    `Usuario: ${username}`,
    ...(temporary
      ? [`Clave temporal: ${password}`, 'Al entrar te pide elegir tu propia clave.']
      : [`Clave: ${password}`]),
  ].join('\n')
}

/** "Ana López" → "AL"; "ana" → "A". */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  return words
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('')
}

/** Lo que hizo quien dejó esa versión, según la bitácora: "Ana la publicó". */
export function publishedBy(origin: string | null, name: string | null | undefined): string {
  const who = name || 'Alguien'
  if (origin === 'nueva') return `${who} la creó`
  if (origin?.startsWith('copia de ')) return `${who} la copió de /e/${origin.slice(9)}`
  if (origin === 'formato anterior') return `${who} la pasó del formato anterior`
  return `${who} la publicó`
}
