# Eventos

Cada evento es una carpeta `eventos/<slug>/`. No hay base de datos: estos archivos **son** los datos.
Todo lo que hay aquí está fuera de git (datos reales), excepto este README.

**La forma normal de armar una invitación es el gestor** (`/gestor`): eliges secciones, colores, letras, imágenes y textos con la invitación a la vista, y publicas. Todo lo que hace el gestor queda en `invitacion.csv`, un archivo que también se puede abrir, editar o armar a mano (ver abajo).

```
eventos/<slug>/
├── invitacion.csv         ← la invitación publicada (lo que ven los invitados)
├── borrador/
│   └── invitacion.csv     ← lo que se edita en el gestor (solo si hay cambios sin publicar)
├── media/                 ← fotos, fondos, adornos y audio (WebP/PNG/JPG/MP3)
│   └── originales/        ← PNG/JPG tal como salen de Canva; `media:optimizar` los pasa a WebP
├── ajustes.csv            ← lo que aplica al instante: clave del panel, si se ve, si es plantilla, fecha límite del cliente
├── ajustes-historial.csv  ← cada cambio de ajustes (la clave sale como "(cambiada)", nunca escrita)
├── invitaciones.csv       ← cada enlace generado en el panel: id, token, invitados, para, creada
├── respuestas.csv         ← un renglón por persona: invitacion, para, lugar, nombre, asistira, respondida, mesa
├── respuestas-historial.csv ← cada envío, en orden (solo crece; es el respaldo fino)
├── aperturas.csv          ← cada vez que se abre una invitación
├── dedicatorias.csv       ← una dedicatoria por enlace: invitacion, para, nombre, dedicatoria, fecha
├── resumen.csv            ← detalle por invitación (lo rehace `invitaciones:resumen`)
└── respaldos/             ← copia del día de cada archivo antes de cambiarlo, y además:
    ├── invitacion-AAAAMMDD-HHMMSS.csv   ← la versión publicada que había antes de cada publicación (las últimas 50)
    ├── publicaciones.csv                ← bitácora: cuándo se publicó y qué versión
    └── formato-anterior-<fecha>/        ← el layout.xlsx de antes, al migrar
```

Los archivos que escribe el sistema se pueden **abrir** en Excel para consultarlos, pero **no se editan ni se guardan desde Excel**: los escribe la API. `invitacion.csv` sí se puede editar (ver "Editar sin el gestor").

- Gestor: `http://localhost:5173/gestor` (pide la clave maestra, `GESTOR_CLAVE` en `api/.env`).
- Panel del cliente: `http://localhost:5173/panel/<slug>` (pide su clave; se genera en el gestor).
- Invitación general (sin pases): `http://localhost:5173/e/<slug>`.
- Invitación personal: `http://localhost:5173/i/<token>` (la genera el panel).

La invitación se diseña para celular primero; en una computadora o tablet acostada (≥ 1024 px) las secciones marcadas como `mitad` se acomodan en pares, lado a lado.

## El gestor

1. **Entrar:** `/gestor`, con la clave maestra (`GESTOR_CLAVE`, de 16 caracteres o más). Sin esa variable el gestor no abre. La sesión dura 12 horas en ese navegador.
2. **Invitaciones y plantillas:** cada tarjeta trae sus colores, su letra, si se ve, si tiene cambios sin publicar y cuántos confirmaron. En su menú ⋯: duplicar, guardar como plantilla y descargar.
3. **Nueva invitación:** en blanco (todas las secciones con textos de ejemplo), desde una plantilla o como copia de otra. Se copian el diseño y `media/`. **Nunca** se copian los enlaces, las respuestas ni la clave del panel: se genera una clave nueva. Nace oculta.
4. **El editor** (`/gestor/<slug>`):
   - **Izquierda:**
     - **Estilo:** paletas sugeridas, "crear desde mi color", cada color con su selector, letras y combinaciones, textos de toda la invitación y fondo de la página.
     - **Datos generales:** el evento, el salón, las confirmaciones, la música, el mensaje y la tarjeta para compartir, la clave del cliente y si la invitación se ve.
     - **Secciones:** se arrastran para ordenarlas (o Alt + flechas), el ojo las oculta y "Agregar" abre la galería. Si una sección visible no aparece, avisa por qué ("Agrega al menos un hotel").
   - **Centro:** la invitación de verdad, en celular o en computadora.
     - **Elegir:** tocar una sección la abre a la derecha; tocar un texto abre su "Aa".
     - **Probar:** la invitación funciona (botones, sobre, formulario de ejemplo).
     - "Enlace personal" la muestra como una invitación de ejemplo de 4 lugares. "Ver como invitado" la muestra con el sobre cerrado.
   - **Derecha:** lo elegido. Cada sección tiene dos pestañas:
     - **Contenido:** sus textos (cada uno con su "Aa"), su lista, sus imágenes y los datos del evento que se ven en ella (el salón en Ubicación, la música en Música, la fecha límite en Confirmación).
     - **Diseño:** fondo, colores propios, imágenes del tema, animaciones y ancho en computadora.
   - **"Aa" de cada texto:** letra, color (de la paleta o uno propio) y tamaño (50 % a 250 %). "Usar en todas las secciones" lo pasa a los textos de toda la invitación.
5. **Guardado:** todo se guarda solo, en el borrador. Los invitados no ven nada hasta **Publicar**. ⌘/Ctrl + Z deshace y ⌘/Ctrl + Shift + Z rehace.
6. **Publicar:** muestra qué cambió. Si algo está mal (una fecha, un enlace que no empieza con `https://`), lo dice, lleva al campo y no deja publicar. La primera vez ofrece hacerla visible.
7. **Historial:** las últimas 50 versiones publicadas. "Restaurar" trae una al borrador para revisarla y publicarla.
8. **Descargar o importar:** `invitacion.csv`, Excel (con una hoja `guia` que explica cada campo) o zip con la invitación y su `media/`. Lo importado queda en el borrador. También acepta el Excel del formato anterior.
9. **Dos ventanas a la vez:** si las dos cambian la misma invitación, la segunda que guarda pregunta si cargar lo de la otra o conservar lo suyo.
10. **Imágenes y audio:**
    - Se suben arrastrando o desde la biblioteca.
    - Las fotos grandes se reducen en el navegador (2400 px) y en el servidor quedan en WebP, con su transparencia. Audio: MP3 o M4A.
    - "Recortar aire transparente" quita los márgenes vacíos de los PNG de Canva.
    - Un archivo que la invitación usa no se puede borrar: la biblioteca dice dónde se usa.

## `invitacion.csv`

Toda la invitación en una hoja de cuatro columnas (UTF-8 con BOM). Ejemplo con datos ficticios:

```csv
seccion,elemento,campo,valor
evento,,tipo,xv
evento,,tema,jardin-azul
evento,,festejada,Ana Sofía
evento,,inicia,2026-11-28 17:00
evento,,salon_ciudad,"Pachuca, Hidalgo"
colores,,primario,#96792C
fuentes,,script,Pinyon Script
textos,,titulo_fuente,Playfair Display
pagina,,fondo,papel.webp
portada,,visible,SI
portada,,imagen_sobre,sobre-rosa-1c2d.webp
bendicion,,visible,SI
bendicion,1,rol,Mis papás
bendicion,1,nombres,"Persona Uno
Persona Dos"
itinerario,,visible,SI
itinerario,,titulo,Itinerario
itinerario,,titulo_color,acento
itinerario,,hora_tamano,120
itinerario,1,hora,17:00
itinerario,1,actividad,Recepción
frase-2,,visible,NO
```

**Reglas:**

- `seccion` dice de qué parte es la fila. Cinco nombres están **reservados** y no se pintan: `evento`, `colores`, `fuentes`, `textos` y `pagina`. Cualquier otro es una sección.
- Las secciones salen **en el orden en que aparecen** por primera vez. Cada una empieza con su fila `visible` (SI/NO).
- `elemento` vacío es un campo de la sección; un número es un elemento de su lista (los momentos del itinerario, los hoteles…). Se ordenan por número; los huecos no importan.
- Un valor vacío es "como lo trae el tema". Sí y no se escriben `SI`/`NO`. Un valor puede tener varias líneas (entre comillas).
- Si un campo se repite, gana el último y sale un aviso. Lo que no se reconoce **se conserva** y da un aviso: nunca se pierde.
- `invitacion:validar <slug>` dice qué revisar, con la sección, el elemento y el campo.

### Bloques reservados

| Bloque | Qué guarda |
|---|---|
| `evento` | Los datos generales (tabla de abajo) |
| `colores` | La paleta, en hex: `fondo`, `texto`, `primario`, `primario_fuerte`, `primario_claro`, `acento`, `acento_suave`, `acento_fuerte` (el azul de los botones del panel), `superficie` y `marco`. Puedes inventar otros (`lino`) |
| `fuentes` | Letras de Google Fonts por rol: `script` (títulos manuscritos), `script_mono` (frases), `serif` (párrafos y datos), `caps` (etiquetas en mayúsculas), `display` (la fecha grande y los números), `button` y `engraved` (las mayúsculas finas de la imagen para WhatsApp) |
| `textos` | Letra, color y tamaño de **todos** los títulos, subtítulos, textos y botones (ver "Letra, color y tamaño") |
| `pagina` | `fondo` (la imagen detrás de toda la invitación) y `decoracion` (las mariposas que cruzan la pantalla: SI/NO) |

### `evento`

| Grupo | Campos |
|---|---|
| Evento | `tipo` (`xv`, `boda`, `bautizo`, `cumple`, `otro`), `tema`, `festejada`, `festejada_corto` (el nombre del sobre), `pareja`, `subtitulo` ("mis xv años"), `titulo` (el de la pestaña del navegador), `inicia` (AAAA-MM-DD HH:MM) y `zona_horaria` |
| Salón | `salon`, `salon_nombre_visible`, `salon_ciudad` (también la usa el clima), `salon_direccion`, `salon_maps` (`https://…`), `salon_foto` y `clima_coordenadas` |
| Confirmaciones | `rsvp_modo`, `rsvp_limite`, `rsvp_whatsapp`, `rsvp_pedir_cancion` y `rsvp_pedir_mensaje` |
| Música | `musica_fuente`, `musica_audio` y `spotify` |
| Compartir | `mensaje_whatsapp`, `titulo_panel` y la imagen que se manda por WhatsApp: `tarjeta_fondo` (un fondo de `media/` con el sobre al centro), `tarjeta_frase` y `tarjeta_texto` (dos frases opcionales arriba de la fecha, como "Celebremos juntos" / "esta etapa tan especial") |

Estos datos van en `evento` porque los usan varias partes: la portada, el calendario, el clima y el PDF del panel. En el gestor aparecen dentro de la sección donde se ven.

`clave_panel` y `publicado` **no** van aquí: están en `ajustes.csv`.

### Secciones

Los tipos, en el orden de la invitación de NAT. Solo `foto`, `frase` y `cierre` se pueden repetir (`frase-2`, `foto-2`…). Los nombres viejos (`sobre`, `familia`, `hoteles`…) se aceptan al leer y se guardan con su nombre de hoy.

| Sección | Campos propios | Elementos de su lista | Datos de `evento` que muestra | Adornos (`imagen_…`) | Textos propios |
|---|---|---|---|---|---|
| `portada` | `boton` ("Toca para abrir") | — | `festejada_corto`, `festejada`, `subtitulo`, el salón | `sobre`, `tarjeta`, `flores`, `corona`, `mariposas`, `lacre` | `nombre` (el grande), `lugar`, `para` (el nombre en el sobre) |
| `musica` | `titulo` | — | `musica_fuente`, `musica_audio`, `spotify` | — | — |
| `bendicion` | `texto`, `subtitulo` | `rol`, `nombres` (uno por línea): "Mis papás", "Mis padrinos" | — | `arco`, `hojas`, `divisor`, `lazo` | `rol`, `nombres` |
| `fecha` | `titulo` | — | `inicia`, `zona_horaria` (el calendario sale de ahí) | `destellos` | `fecha`, `calendario` |
| `foto` | `imagen` (recortada sin fondo), `titulo` (unas iniciales o un apodo en la esquina) | — | — | `marco`, `estrellas`, `mariposas` | — |
| `ubicacion` | `titulo`, `boton` | Varias ubicaciones (misa y recepción): `etiqueta`, `lugar`, `hora`, `direccion`, `maps`, `foto` | El salón: `salon`, `salon_nombre_visible`, `salon_ciudad`, `salon_direccion`, `salon_maps`, `salon_foto` | — | `etiqueta`, `lugar`, `detalle` |
| `frase` | `texto` | — | — | `divisor` | — |
| `itinerario` | `titulo`, `variante` | `hora` (`17:00` o `5:00 pm`), `actividad`, `icono` | — | `marco` | `hora`, `actividad` |
| `vestimenta` | `titulo`, `subtitulo`, `texto`, `colores` (de 1 a 4 hex, separados por espacio) | — | — | `lacre`, `tarjeta`, `mujer`, `hombre` | — |
| `sin_ninos` | `titulo`, `subtitulo` (la etiqueta "Solo adultos"), `texto` | — | — | `lazo` | — |
| `clima` | `titulo`, `texto` | — | `salon_ciudad`, `clima_coordenadas` | — | `lugar`, `datos` |
| `hospedaje` | `titulo`, `subtitulo`, `texto`, `boton` | `nombre` (obligatorio), `nota`, `direccion`, `maps`, `telefono`, `foto` | — | `tarjeta`, `divisor` | `nombre`, `nota`, `direccion` |
| `playlist` | `titulo`, `subtitulo`, `texto`, `boton`, `variante` | — | `spotify` | — | — |
| `cuenta_regresiva` | `titulo`, `texto` | — | `inicia` | `corona`, `mariposa` | `numeros`, `unidades` |
| `confirmacion` | `titulo`, `subtitulo`, `boton` | — | `rsvp_modo`, `rsvp_limite`, `rsvp_whatsapp` | `tarjeta`, `flores` | `fecha_limite` |
| `dedicatoria` | `titulo`, `texto`, `boton` | — | — | `divisor` | `mensaje`, `autor` |
| `cierre` | `titulo`, `texto` | — | — | `flores`, `corona` | — |

**Íconos del itinerario** (`icono`): un archivo de `media/` (`copas.webp`) o un nombre: `utensils`, `church`, `crown`, `music`, `heart`, `ring`, `dove`, `gift`, `cake-candles`, `door-open`, `champagne-glasses`, `location-dot`.

**Campos de cualquier sección:**

- Textos: `titulo`, `subtitulo`, `texto`, `boton`.
- Diseño: `variante`, `fondo`, `fondo_ajuste`, `color_fondo`, `overlay`, `fijo`, `efectos`, `escritorio`.
- `color_<color>`: colores propios de la sección (`color_primario`, `color_texto`…). Con alguno, la sección usa su propia paleta y lo que no cambies sigue a la de toda la invitación.
- `imagen_<adorno>`: cambia una imagen del tema solo en esa sección (`imagen_sobre`, `imagen_marco`). El valor `ninguna` la quita.
- Estilo de cada texto: `<bloque>_fuente`, `<bloque>_color` y `<bloque>_tamano` (abajo).

Cada sección se pinta como un **panel** con su propio fondo y el mismo espacio entre todas (la portada va sin panel). Las que no traen `fondo` ni `color_fondo` se turnan los fondos del tema, así dos seguidas nunca se ven iguales.

### Letra, color y tamaño

Cada texto de la invitación es un **bloque**: los cuatro comunes (`titulo`, `subtitulo`, `texto`, `boton`) y los propios de cada sección (última columna de la tabla). Cada bloque acepta tres campos:

| Campo | Valor |
|---|---|
| `<bloque>_fuente` | Una familia de Google Fonts (`Great Vibes`). Si no está en la lista sugerida del gestor, solo avisa |
| `<bloque>_color` | Un hex o un nombre de la paleta (`acento`). Con el nombre, el texto sigue a la paleta si esta cambia |
| `<bloque>_tamano` | Un porcentaje de 50 a 250 sobre el tamaño que pone el tema |

- En `textos` valen para toda la invitación (solo los cuatro comunes).
- En una sección valen solo para ella y ganan sobre `textos`.
- El tamaño multiplica al del tema, que ya se ajusta al ancho de la sección: se sigue viendo bien en celular y en computadora.
- Sin estilos, la invitación se ve tal como la diseña el tema.

### Fondos, efectos y escritorio

**Fondos**: en `fondo` va el nombre de un archivo de `media/` (`toile.webp`). `fondo_ajuste` es `cubrir` (la imagen cubre la sección; por defecto) o `mosaico` (el estampado se repite, ideal para texturas: no se ve borroso en pantallas grandes). `color_fondo` acepta un hex o un nombre de la paleta (`lino`). `overlay` oscurece de 0 a 1. `fijo` = SI deja el fondo quieto al hacer scroll.

**Efectos** (`efectos`, separados por espacio o coma):

- `aparecer`, `parallax`, `flotar`, `brillo`, `linea`.
- `escribir`: la frase o el título de `ubicacion` aparecen letra por letra.
- `destellos`: estrellitas doradas que titilan.
- `cascada`: los elementos de la sección entran uno tras otro (horas del itinerario, números del contador, horas del clima).
- `acercamiento`: la foto se acerca muy despacio.
- `cambio_de_color` (o `colores`): el fondo pasa despacio por los tonos del tema; en `vestimenta`, además, la tarjeta va y viene a negro con los textos en blanco.
- `ninguno` apaga los que el tema trae por defecto.

Si la sección trae efectos, reemplazan a los del tema; vacía, se usan los del tema.

Sin configurar nada, el tema también pone mariposas que cruzan la pantalla de vez en cuando (`pagina` → `decoracion`), pétalos y confeti al abrir el sobre y al confirmar asistencia, el corazón y las barras del reproductor que se mueven con la música, y el segundero que late. Todo se apaga si el celular tiene activado "reducir movimiento".

**Escritorio** (`escritorio`): `completo` ocupa toda la fila; `mitad` se pone junto a la siguiente sección `mitad`. Una `mitad` sin pareja se queda con la fila completa. Vacío = lo que diga el tema (en `jardin-azul`: fecha | foto, ubicación | frase, itinerario | vestimenta, cuenta regresiva | confirmación).

### Música, playlist, clima y dedicatoria

**Música**: lo que suena al abrir el sobre sale de una de dos fuentes (`musica_fuente`):

- `archivo`: `musica_audio` es el nombre de un MP3 en `media/` (ideal ≤ 3 MB). Sin MP3, el reproductor se ve pero sus botones quedan desactivados.
- `spotify`: suena la playlist (o la canción) de `spotify` (el enlace de Compartir → Copiar enlace). El reproductor de Spotify aparece en la sección `playlist` (o, si no hay, debajo del reproductor `musica`) y los controles dorados y el botón flotante lo manejan. Quien no tiene sesión de Spotify en ese navegador oye muestras de 30 s por canción; en iPhone, Safari puede pedir tocar ▶ en el reproductor (la invitación lo avisa).

Sin `musica_fuente`: se usa el MP3 si hay; si no hay MP3 pero sí playlist, Spotify. Con MP3, la `playlist` es un reproductor aparte (al tocarlo se pausa la canción de la invitación).

**Playlist** (`playlist`): la playlist de `spotify` con su lista de canciones, como la comparte Spotify. Se puede tocar: play, pausa, elegir canción y recorrer la lista dentro del reproductor. `variante`: `completa` (por defecto, se ven unas 7 canciones), `lista` (3, el tamaño estándar de Spotify) o `compacta` (solo portada y botón). Sin enlace válido de Spotify la sección no aparece.

**Clima** (`clima`): el clima del día del evento en la ciudad del salón (`salon_ciudad`, por ejemplo "Pachuca, Hidalgo"; o `clima_coordenadas` como `20.1170, -98.7333` para más precisión). Mientras faltan más de 16 días muestra el clima típico de esa fecha (promedio de 10 años); desde 16 días antes, el pronóstico real, que se renueva cada 30 minutos. Incluye la temperatura en las horas de la fiesta y un consejo (abrigo, paraguas). Se quita sola un día después del evento. Datos de Open-Meteo. En la vista previa del gestor sale un ejemplo hasta que la invitación se publica.

**Dedicatoria** (`dedicatoria`): nombre y mensaje (`titulo`, `texto` y `boton` cambian los textos). **Una por enlace**: ya enviada se ve fija y no se puede cambiar; se guarda en `dedicatorias.csv` y la ves en el panel. No depende de la fecha límite. En la invitación general (`/e/<slug>`) pide abrir el enlace personal.

## `ajustes.csv`

Lo que aplica **al instante**, sin pasar por "Publicar". Lo escribe la API (desde el gestor o el panel).

| Clave | Qué es |
|---|---|
| `clave_panel` | La clave del panel del cliente. El gestor genera una de 12 caracteres o más; el mínimo es 8. Si cambia, las sesiones abiertas del panel se cierran |
| `publicado` | `SI`/`NO`: si los invitados pueden abrir la invitación. Una invitación nueva nace en `NO` |
| `plantilla` | `SI`: es una plantilla. Nunca es pública (`/e/<slug>` responde 404) y no tiene panel |
| `rsvp_limite`, `rsvp_limite_cambios` | La fecha límite que el cliente movió desde su panel y cuántas veces (máximo 3). Gana sobre la de la invitación. Si publicas otra fecha, el gestor pregunta cuál dejar |

El diseño nunca lleva la clave: descargar, copiar o hacer plantilla una invitación no la incluye.

## Plantillas

Una plantilla es un evento con `plantilla=SI`: el mismo formato y la misma carpeta, en su propia pestaña del gestor. Se crean con "Guardar como plantilla" desde la tarjeta de una invitación (copia su diseño y su media) y se usan desde "Nueva invitación". En el gestor, "Publicar" en una plantilla dice "Guardar plantilla": lo publicado es lo que copian las invitaciones nuevas.

## Editar sin el gestor

Siempre se puede desarmar y volver a armar una invitación fuera del gestor:

- **Excel:** en el gestor, ⋯ → "Descargar o importar" → Excel. Cambia lo que quieras y vuelve a importarlo: queda en el borrador para revisarlo y publicarlo.
- **Terminal:** `invitacion:exportar` e `invitacion:importar` (abajo), con los mismos formatos.
- **Directo en la carpeta:** `invitacion.csv` es lo publicado; al guardarlo, recarga la página. Si hay un borrador, el gestor sigue mostrando el borrador.

Si algo está mal, la API responde con la lista de errores en español (qué sección, qué elemento y qué campo revisar).

## Panel de invitaciones

1. **La clave:** en el gestor, "Datos generales" → "Acceso del cliente" → "Generar clave". Se guarda al instante en `ajustes.csv`. Sin clave, el panel no abre. Si la cambias, las sesiones abiertas se cierran.
2. Entra a `/panel/<slug>` y escribe la clave. El panel se ve con los colores y las letras de la invitación (el azul es lo principal) y su título en grande ("XV de Nat"). La sesión dura 12 horas y solo en esa pestaña.
3. **Generar enlace**: escribe para cuántos invitados es (1 a 30) y, si quieres, el nombre que aparecerá en el sobre ("Familia Pérez"). Queda lista para **Enviar**.
4. **Invitaciones generadas** (se despliega al tocarla): para cuántos invitados es cada una, quiénes ya confirmaron y cuántas veces se abrió. "Mesa para todos" sienta de una vez a los que asisten de esa invitación. El enlace no se muestra: solo "copiar link" o "ver link".
   - **Enviar**: arma la invitación con los colores del evento (nombre, para quién es, fecha, salón y un QR) como **PDF**. Al tocarlo en cualquier parte se abre la invitación; el enlace no se ve. En el celular abre el menú de compartir para elegir WhatsApp; en la computadora descarga el PDF y abre WhatsApp con el mensaje (sin el enlace) para adjuntarlo. También se puede descargar la imagen sola.
5. **Invitados**: la lista completa de personas de todas las invitaciones (filtros: asistirán, no asistirán, sin mesa, lugares libres) con su **mesa** (número de 1 a 999; vacío la quita). Arriba, cuántas personas hay en cada mesa. La mesa se guarda en `respuestas.csv` (columna `mesa`), lista para el buscador de recepción.
6. **Dedicatorias**: las que dejaron los invitados (una por enlace), la más reciente primero, con buscador.
7. **En vivo**: el panel revisa cada 5 segundos si alguien abrió, confirmó o dejó su dedicatoria y se actualiza solo, sin recargar (en pausa mientras la pestaña está oculta). También se actualiza al publicar cambios en el gestor; mientras solo se edita el borrador, no.
8. **Fecha límite**: el cliente puede cambiarla **hasta 3 veces** (de hoy al día del evento). El cambio se guarda en `ajustes.csv`; la invitación no se toca.

## Confirmaciones (RSVP)

- Todas las invitaciones son iguales; cambia el formulario: **un campo de nombre por invitado** y "Asistiré / Lo siento, no asistiré".
- Se puede llenar por partes: los nombres enviados **quedan fijos** (no se pueden cambiar) y los campos vacíos siguen disponibles cuando se vuelve a abrir el enlace. Reenviar un nombre que ya está no lo duplica.
- **`rsvp_limite`** (o la fecha del panel): último día para confirmar, completo, en la zona del evento. Al pasar, solo cuentan los nombres ya enviados; los campos vacíos se deshabilitan y la API rechaza envíos.
- **`rsvp_modo`**: `token` (enlaces del panel; lo normal), `whatsapp`, `open` u `off`.
- **`rsvp_whatsapp`**: número al que lleva el botón en la invitación general (`/e/<slug>`), que no tiene pases.
- **`mensaje_whatsapp`**: texto con el que se manda cada enlace desde el panel. Usa `{familia}` (el nombre de la invitación), `{, familia}` (", Familia Pérez" solo si tiene nombre), `{pases}` ("4 pases") y `{enlace}`. Ejemplo: `¡Hola{, familia}! 💙 Te compartimos la invitación a mis XV años ({pases}): {enlace}`.

## Comandos

```bash
# Desarmar y armar (los mismos servicios que usa el gestor)
docker compose exec api php artisan invitacion:validar <slug>                       # qué revisar, en español
docker compose exec api php artisan invitacion:exportar <slug> --formato=zip        # csv, xlsx o zip (con media/)
docker compose exec api php artisan invitacion:importar <slug> <archivo> [--publicar]  # csv, xlsx (también el anterior) o zip → borrador

# Pasar un evento del formato anterior (layout.xlsx) a invitacion.csv
docker compose exec api php artisan invitacion:migrar <slug> --probar   # compara; no escribe nada
docker compose exec api php artisan invitacion:migrar <slug>            # migra solo si la invitación queda idéntica
docker compose exec api php artisan invitacion:migrar --todos           # todos los que siguen en el formato anterior
docker compose exec api php artisan invitacion:migrar <slug> --limpiar  # después: mueve el layout viejo a respaldos/

# Otros
docker compose exec api php artisan invitaciones:resumen <slug>   # totales (como el panel) → resumen.csv
docker compose exec api php artisan media:optimizar <slug> [archivo.png …] [--ancho=920]   # originales → WebP
docker compose exec api php artisan media:optimizar <slug> sobre.png --recortar               # quita el aire transparente que deja Canva
docker compose exec api php artisan media:optimizar <slug> tarjeta.png --recortar --sin-sombra  # además quita la sombra (deja solo el papel)
```

## Formato anterior (`layout.xlsx`), deprecado

Hasta octubre de 2026 cada invitación era un `layout.xlsx` con nueve pestañas (`evento`, `paleta`, `tipografia`, `secciones`, `familia`, `itinerario`, `ubicaciones`, `hoteles` y la vieja `familias`), o sus CSV por pestaña. Un evento **sin** `invitacion.csv` se sigue leyendo así, sin cambios, para que nada se rompa; ese camino ya no recibe mejoras y se quitará después del 28-nov-2026.

Para pasarlo al formato nuevo hay dos caminos:

- **Gestor:** al abrirlo, lo convierte y dice si la conversión es idéntica o qué cambia. Lo que edites queda en el borrador; publicarlo es la migración.
- **Terminal:** `invitacion:migrar` (arriba). Compara la invitación armada de las dos formas; si no es idéntica, muestra las diferencias y no escribe nada (salvo `--forzar`). Al migrar, `clave_panel` y `publicado` pasan a `ajustes.csv` y el Excel se copia a `respaldos/formato-anterior-<fecha>/`. No toca los CSV que escribe la app. Correrlo dos veces no hace daño.

| Antes (`layout.xlsx`) | Ahora (`invitacion.csv`) |
|---|---|
| Pestaña `evento` | Bloque `evento` (menos `clave_panel` y `publicado`, que van a `ajustes.csv`) |
| Pestañas `paleta` y `tipografia` | Bloques `colores` y `fuentes` |
| Pestaña `secciones` (una fila por sección, con `orden`) | Una sección por bloque, en el orden en que aparecen |
| `retrato` | `foto` → `imagen` |
| `vestimenta_colores` | `vestimenta` → `colores` |
| Pestaña `familia` | Elementos de `bendicion` (`rol`, `nombres`; los del mismo rol se juntan) |
| Pestañas `itinerario`, `ubicaciones` y `hoteles` | Elementos de `itinerario`, `ubicacion` y `hospedaje` |
| Datos sin sección (hoteles sin la sección `hospedaje`) | Una sección oculta con esos datos |

`layout:xlsx` (armar el Excel desde CSV) también queda deprecado: lo sustituye "Descargar" del gestor o `invitacion:exportar`.
