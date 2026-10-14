# Eventos

Cada evento es una carpeta `eventos/<slug>/`. No hay base de datos: estos archivos **son** los datos.
Todo lo que hay aquí está fuera de git (datos reales), excepto este README.

```
eventos/<slug>/
├── layout.xlsx        ← lo editas tú en Excel (una pestaña por tema)
├── media/             ← fotos, fondos, decoraciones y audio (WebP/PNG/JPG/MP3)
│   └── originales/    ← PNG/JPG tal como salen de Canva; `media:optimizar` los pasa a WebP
├── invitaciones.csv   ← cada enlace generado en el panel: id, token, invitados, para, creada
├── respuestas.csv     ← un renglón por persona: invitacion, para, lugar, nombre, asistira, respondida, mesa
├── respuestas-historial.csv ← cada envío, en orden (solo crece; es el respaldo fino)
├── aperturas.csv      ← cada vez que se abre una invitación
├── dedicatorias.csv   ← una dedicatoria por enlace: invitacion, para, nombre, dedicatoria, fecha
├── ajustes.csv        ← lo que cambias desde el panel (fecha límite y cuántas veces la cambiaste)
├── ajustes-historial.csv ← cada cambio de fecha límite
├── resumen.csv        ← detalle por invitación (lo rehace `invitaciones:resumen`)
└── respaldos/         ← copia del día de cada archivo antes de cambiarlo
```

Los archivos que escribe el sistema se pueden **abrir** en Excel para consultarlos, pero **no se editan ni se guardan desde Excel**: los escribe la API.

- Panel del dueño: `http://localhost:5173/panel/<slug>` (pide la `clave_panel`).
- Invitación general (sin pases): `http://localhost:5173/e/<slug>`.
- Invitación personal: `http://localhost:5173/i/<token>` (la genera el panel).

Al guardar el Excel, recarga la página. La invitación se diseña para celular primero; en una computadora o tablet acostada (≥ 1024 px) las secciones marcadas como `mitad` se acomodan en pares, lado a lado.

## Pestañas de `layout.xlsx`

| Pestaña | Columnas | Para qué |
|---|---|---|
| `evento` | `clave`, `valor` | Datos del evento: `tema`, `inicia` (AAAA-MM-DD HH:MM), `zona_horaria`, `rsvp_limite`, `rsvp_modo`, `rsvp_whatsapp`, `mensaje_whatsapp`, `clave_panel`, `salon…` (`salon_ciudad` también sirve para el clima), `retrato`, `musica_audio`, `musica_fuente`, `spotify`, `clima_coordenadas`, `vestimenta_colores`, `publicado` (SI/NO) |
| `paleta` | `token`, `color`, `uso` | Colores en hex. Nombres conocidos: `fondo`, `texto`, `primario`, `primario_fuerte`, `primario_claro`, `acento`, `acento_suave`, `superficie`, `marco`. Puedes inventar otros (`lino`) |
| `tipografia` | `rol`, `fuente`, `uso` | Fuentes de Google Fonts por rol: `script`, `script_mono`, `serif`, `caps`, `display`, `button` |
| `secciones` | `orden`, `seccion`, `titulo`, `subtitulo`, `texto`, `boton`, `variante`, `fondo`, `fondo_ajuste`, `color_fondo`, `overlay`, `fijo`, `efectos`, `visible`, `escritorio` | Una fila por sección, en el orden en que aparecen. Las palabras de cada sección van en su fila |
| `familia` | `rol`, `nombre` | Un renglón por nombre; los del mismo rol se agrupan ("Mis papás") |
| `itinerario` | `hora`, `actividad`, `icono` | Hora como `17:00` o `5:00 pm`. Ícono: un archivo de `media/` (`copas.webp`) o un nombre (`utensils`, `church`, `crown`, `music`, `heart`, `ring`, `dove`, `gift`, `cake-candles`, `door-open`, `champagne-glasses`, `location-dot`) |
| `ubicaciones` | `etiqueta`, `lugar`, `hora`, `direccion`, `maps`, `foto` | Opcional, para varias ubicaciones (misa y recepción) |

**Secciones** (`seccion`): `portada`, `musica`, `bendicion`, `fecha`, `foto`, `ubicacion`, `frase`, `itinerario`, `vestimenta`, `sin_ninos`, `clima`, `playlist`, `cuenta_regresiva`, `confirmacion`, `dedicatoria`, `cierre`.

Cada sección se pinta como un **panel** con su propio fondo y el mismo espacio entre todas (la portada va sin panel). Las que no traen `fondo` ni `color_fondo` se turnan los fondos del tema, así dos seguidas nunca se ven iguales.

**Efectos** (`efectos`, separados por espacio o coma): `aparecer`, `parallax`, `flotar`, `brillo`, `linea`, `escribir` (la frase o el título de `ubicacion` aparecen letra por letra), `destellos` (estrellitas doradas que titilan), `cascada` (los elementos de la sección entran uno tras otro: horas del itinerario, números del contador, horas del clima), `acercamiento` (la foto se acerca muy despacio) y `cambio_de_color` o `colores` (el fondo pasa despacio por los tonos del tema; en `vestimenta`, además, la tarjeta va y viene a negro con los textos en blanco; con espacios no, porque el espacio separa efectos). `ninguno` apaga los que el tema trae por defecto. Si la columna trae efectos, reemplazan a los del tema; vacía, se usan los del tema.

Sin configurar nada, el tema también pone mariposas que cruzan la pantalla de vez en cuando, pétalos y confeti al abrir el sobre y al confirmar asistencia, el corazón y las barras del reproductor que se mueven con la música, y el segundero que late. Todo se apaga si el celular tiene activado "reducir movimiento".

**Escritorio** (`escritorio`): `completo` ocupa toda la fila; `mitad` se pone junto a la siguiente sección `mitad`. Una `mitad` sin pareja se queda con la fila completa. Vacío = lo que diga el tema (en `jardin-azul`: fecha | foto, ubicación | frase, itinerario | vestimenta, cuenta regresiva | confirmación).

**Fondos**: en `fondo` va el nombre de un archivo de `media/` (`toile.webp`); `fondo_ajuste` es `cubrir` (la imagen cubre la sección; por defecto) o `mosaico` (el estampado se repite, ideal para texturas: no se ve borroso en pantallas grandes); `color_fondo` acepta un hex o un nombre de la paleta (`lino`); `overlay` oscurece de 0 a 1; `fijo` = SI deja el fondo quieto al hacer scroll.

**Música**: lo que suena al abrir el sobre sale de una de dos fuentes (`musica_fuente`):

- `archivo`: `musica_audio` es el nombre de un MP3 en `media/` (ideal ≤ 3 MB). Sin MP3, el reproductor se ve pero sus botones quedan desactivados.
- `spotify`: suena la playlist (o la canción) de `spotify` (el enlace de Compartir → Copiar enlace). El reproductor de Spotify aparece en la sección `playlist` (o, si no hay, debajo del reproductor `musica`) y los controles dorados y el botón flotante lo manejan. Quien no tiene sesión de Spotify en ese navegador oye muestras de 30 s por canción; en iPhone, Safari puede pedir tocar ▶ en el reproductor (la invitación lo avisa).

Sin `musica_fuente`: se usa el MP3 si hay; si no hay MP3 pero sí playlist, Spotify. Con MP3, la `playlist` es un reproductor aparte (al tocarlo se pausa la canción de la invitación).

**Playlist** (`playlist`): la playlist de `spotify` con su lista de canciones, como la comparte Spotify. Se puede tocar: play, pausa, elegir canción y recorrer la lista dentro del reproductor. `variante`: `completa` (por defecto, se ven unas 7 canciones), `lista` (3, el tamaño estándar de Spotify) o `compacta` (solo portada y botón). Sin enlace válido de Spotify la sección no aparece.

**Clima** (`clima`): el clima del día del evento en la ciudad del salón (`salon_ciudad`, por ejemplo "Pachuca, Hidalgo"; o `clima_coordenadas` como `20.1170, -98.7333` para más precisión). Mientras faltan más de 16 días muestra el clima típico de esa fecha (promedio de 10 años); desde 16 días antes, el pronóstico real, que se renueva cada 30 minutos. Incluye la temperatura en las horas de la fiesta y un consejo (abrigo, paraguas). Se quita sola un día después del evento. Datos de Open-Meteo.

**Secciones con su contenido**: portada (sobre que se abre; en un enlace personal el sobre lleva el nombre que le pusiste en el panel), musica, bendicion (texto + pestaña `familia`), fecha (calendario generado de `inicia`), foto (`retrato`, recortada sin fondo), ubicacion (salón o pestaña `ubicaciones` y botón a Maps), frase, itinerario, vestimenta (`vestimenta_colores`), sin_ninos (`titulo`, `subtitulo` como etiqueta "Solo adultos" y `texto`), cuenta_regresiva, confirmacion, dedicatoria y cierre. "Agregar a mi calendario" va en `fecha`.

**Dedicatoria** (`dedicatoria`): nombre y mensaje (`titulo`, `texto` y `boton` cambian los textos). **Una por enlace**: ya enviada se ve fija y no se puede cambiar; se guarda en `dedicatorias.csv` y la ves en el panel. No depende de la fecha límite. En la invitación general (`/e/<slug>`) pide abrir el enlace personal.

Si algo del Excel está mal, la API responde con la lista de errores en español (qué pestaña y qué fila revisar).

## Panel de invitaciones

1. En la pestaña `evento` agrega `clave_panel` con una clave de **al menos 8 caracteres**. Sin ella el panel no abre. Si la cambias, las sesiones abiertas se cierran.
2. Entra a `/panel/<slug>` y escribe la clave. La sesión dura 12 horas y solo en esa pestaña.
3. **Generar enlace**: escribe para cuántos invitados es (1 a 30) y, si quieres, el nombre que aparecerá en el sobre ("Familia Pérez"). Cópialo o mándalo por WhatsApp desde ahí.
4. **Invitaciones**: todos los enlaces generados, para cuántos invitados es cada uno, quiénes ya confirmaron y cuántas veces se abrió. "Mesa para todos" sienta de una vez a los que asisten de esa invitación.
5. **Invitados**: la lista completa de personas de todas las invitaciones (filtros: asistirán, no asistirán, sin mesa, lugares libres) con su **mesa** (número de 1 a 999; vacío la quita). Arriba, cuántas personas hay en cada mesa. La mesa se guarda en `respuestas.csv` (columna `mesa`), lista para el buscador de recepción.
6. **Dedicatorias**: las que dejaron los invitados (una por enlace), la más reciente primero, con buscador.
7. **En vivo**: el panel revisa cada 5 segundos si alguien abrió, confirmó o dejó su dedicatoria y se actualiza solo, sin recargar (en pausa mientras la pestaña está oculta).
8. **Fecha límite**: puedes cambiarla **hasta 3 veces** (de hoy al día del evento). El cambio se guarda en `ajustes.csv`; tu Excel no se toca.

## Confirmaciones (RSVP)

- Todas las invitaciones son iguales; cambia el formulario: **un campo de nombre por invitado** y "Asistiré / Lo siento, no asistiré".
- Se puede llenar por partes: los nombres enviados **quedan fijos** (no se pueden cambiar) y los campos vacíos siguen disponibles cuando se vuelve a abrir el enlace. Reenviar un nombre que ya está no lo duplica.
- **`rsvp_limite`** (o la fecha del panel): último día para confirmar, completo, en la zona del evento. Al pasar, solo cuentan los nombres ya enviados; los campos vacíos se deshabilitan y la API rechaza envíos.
- **`rsvp_modo`**: `token` (enlaces del panel; lo normal), `whatsapp`, `open` u `off`.
- **`rsvp_whatsapp`**: número al que lleva el botón en la invitación general (`/e/<slug>`), que no tiene pases.
- **`mensaje_whatsapp`**: texto con el que se manda cada enlace desde el panel. Usa `{familia}` (el nombre de la invitación), `{, familia}` (", Familia Pérez" solo si tiene nombre), `{pases}` ("4 pases") y `{enlace}`. Ejemplo: `¡Hola{, familia}! 💙 Te compartimos la invitación a mis XV años ({pases}): {enlace}`.

## Comandos

```bash
docker compose exec api php artisan invitaciones:resumen <slug>   # totales (como el panel) → resumen.csv
docker compose exec api php artisan layout:xlsx <slug> --desde=<carpeta-con-csv>   # arma layout.xlsx desde CSV
docker compose exec api php artisan media:optimizar <slug> [archivo.png …] [--ancho=920]   # originales → WebP
docker compose exec api php artisan media:optimizar <slug> sobre.png --recortar               # quita el aire transparente que deja Canva
docker compose exec api php artisan media:optimizar <slug> tarjeta.png --recortar --sin-sombra  # además quita la sombra (deja solo el papel)
```
