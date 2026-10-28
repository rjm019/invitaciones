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
│   (`<foto>-480.webp`: miniatura de la galería, la crea el gestor al subir o `media:miniaturas`; no se edita ni aparece en la biblioteca)
├── ajustes.csv            ← lo que aplica al instante: clave del panel, si se ve, si es plantilla o muestra (`demo`), quién la edita en el gestor, fecha límite del cliente
├── ajustes-historial.csv  ← cada cambio de ajustes y quién lo hizo (la clave sale como "(cambiada)", nunca escrita)
├── invitaciones.csv       ← cada enlace generado en el panel: id, token, invitados, para, creada, eliminada, telefono (WhatsApp para los recordatorios; solo dígitos con lada, p. ej. 525512345678)
├── recordatorios.csv      ← cada recordatorio por WhatsApp y su estado (solo crece): fecha, invitacion, wamid, estado, detalle
├── respuestas.csv         ← un renglón por persona: invitacion, para, lugar, nombre, asistira, respondida, mesa
├── respuestas-historial.csv ← cada envío, en orden (solo crece; es el respaldo fino)
├── aperturas.csv          ← cada vez que se abre una invitación
├── dedicatorias.csv       ← una dedicatoria por enlace: invitacion, para, nombre, dedicatoria, fecha
├── trivia.csv             ← una participación por enlace: invitacion, para, nombre, respuestas, aciertos, segundos, fecha (más trivia-inicios.csv y trivia-eliminadas.csv)
├── album.csv              ← bitácora del álbum de los invitados: id, invitacion, para, archivo, ancho, alto, estado (pendiente|elegida|rechazada|borrada), subida, decidida (más album-eliminadas.csv)
├── album/                 ← fotos que suben los invitados (WebP 1600 px + miniatura -480); FUERA de /media: nadie las ve hasta elegirlas. Se borra completa al cerrar el álbum
├── media/album/           ← solo las elegidas (copia): Apache las sirve directo. Se borra con el álbum
├── respuestas-eliminadas.csv, dedicatorias-eliminadas.csv ← las personas y dedicatorias de las invitaciones eliminadas, con la fecha
├── resumen.csv            ← detalle por invitación (lo rehace `invitaciones:resumen`)
└── respaldos/             ← copia del día de cada archivo antes de cambiarlo, y además:
    ├── invitacion-AAAAMMDD-HHMMSS.csv   ← la versión publicada que había antes de cada publicación (las últimas 50)
    ├── publicaciones.csv                ← bitácora: cuándo se publicó (o se creó o migró) y quién
    └── formato-anterior-<fecha>/        ← el layout.xlsx de antes, al migrar
```

Aparte de los eventos, `eventos/_gestor/usuarios.csv` guarda las cuentas del gestor (usuario, nombre, rol, si tiene acceso y el hash de su clave; nunca la clave). `_gestor` nunca es un evento. Ahí también viven las cotizaciones (`cotizaciones.csv`) y las visitas del sitio (`visitas/AAAA-MM-DD.csv`, una por página vista, con la IP, de dónde llegó y el dispositivo; la IP se borra al año). Las visitas se ven en el gestor → "Estadísticas" y se descargan desde ahí.

Los archivos que escribe el sistema se pueden **abrir** en Excel para consultarlos, pero **no se editan ni se guardan desde Excel**: los escribe la API. `invitacion.csv` sí se puede editar (ver "Editar sin el gestor").

- Gestor: `http://localhost:5173/gestor` (cada quien con su usuario; la primera vez pide crear tu cuenta con la clave maestra, `GESTOR_CLAVE` en `api/.env`).
- Panel del cliente: `http://localhost:5173/panel/<slug>` (pide su clave; se genera en el gestor).
- Invitación general (sin pases): `http://localhost:5173/e/<slug>`.
- Invitación personal: `http://localhost:5173/i/<token>` (la genera el panel).

La invitación se diseña para celular primero; en una computadora o tablet acostada (≥ 1024 px) las secciones marcadas como `mitad` se acomodan en pares, lado a lado.

## El gestor

1. **Entrar:** `/gestor`, cada persona con su usuario y su clave. La sesión dura 12 horas en ese navegador.
   - **La primera vez** pide "Crea la primera cuenta" con la clave maestra (`GESTOR_CLAVE`, 16 caracteres o más; sin ella el gestor no abre). Esa cuenta *administra*.
   - **Personas** (menú de tu cuenta, si administras): agregar a alguien le da una clave temporal, con un mensaje listo para mandárselo; al entrar elige la suya. Ahí también se cambia su rol (*Administra* o *Edita*), se le da otra clave temporal o se le quita el acceso (su nombre se queda en el historial).
   - **Cambiar mi clave**, en el mismo menú. Si alguien se queda fuera: `php artisan gestor:usuario <usuario> --clave-nueva`.
   - **Quién ve qué:** quien *edita* ve solo las invitaciones que creó o que le asignaron, y todas las plantillas. Quien *administra* ve todas y las asigna en "Datos generales" → "Quién la edita" (queda en `ajustes.csv` → `personas_gestor`).
2. **Invitaciones, plantillas y muestras:** cada una en su pestaña (las muestras de la landing, con `demo=SI`, van en "Muestras" para no llenar la lista; la pestaña solo sale si hay). Cada tarjeta trae sus colores, su letra, si se ve, si tiene cambios sin publicar y cuántos confirmaron. En su menú ⋯: duplicar, guardar como plantilla y descargar; quien administra también puede **eliminar** invitaciones, plantillas y muestras (ver "Eliminar").
3. **Nueva invitación:** en blanco (todas las secciones con textos de ejemplo), desde una plantilla o como copia de otra. Se copian el diseño y `media/`. **Nunca** se copian los enlaces, las respuestas ni la clave del panel: se genera una clave nueva. Nace oculta.
4. **El editor** (`/gestor/<slug>`):
   - **Izquierda:**
     - **Estilo:** paletas sugeridas, "crear desde mi color", cada color con su selector, letras y combinaciones, textos de toda la invitación y fondo de la página.
     - **Datos generales:** el evento, el salón, las confirmaciones, la música, el mensaje y la tarjeta para compartir, la clave del cliente y si la invitación se ve.
     - **Secciones:** se arrastran para ordenarlas (o Alt + flechas), el ojo las oculta y "Agregar" abre la galería. Si una sección visible no aparece, avisa por qué ("Agrega al menos un hotel").
   - **Centro:** la invitación de verdad, en celular o en computadora.
     - **Elegir:** tocar una sección la abre a la derecha; tocar un texto abre su "Aa".
     - **Probar:** la invitación funciona (botones, sobre, formulario de ejemplo).
     - "Enlace personal" la muestra como una invitación de ejemplo de 4 lugares. "Ver como invitado" la muestra con el sobre cerrado (también si tu computadora tiene "reducir movimiento"; entonces abre sin animación).
   - **Derecha:** lo elegido. Cada sección tiene dos pestañas:
     - **Contenido:** sus textos (cada uno con su "Aa"), su lista, sus imágenes y los datos del evento que se ven en ella (el salón en Ubicación, la música en Música, la fecha límite en Confirmación).
     - **Diseño:** fondo, colores propios, imágenes del tema, animaciones y ancho en computadora.
   - **"Aa" de cada texto:** letra, color (de la paleta o uno propio) y tamaño (50 % a 250 %). "Usar en todas las secciones" lo pasa a los textos de toda la invitación.
5. **Guardado:** todo se guarda solo, en el borrador. Los invitados no ven nada hasta **Publicar**. ⌘/Ctrl + Z deshace y ⌘/Ctrl + Shift + Z rehace.
6. **Publicar:** muestra qué cambió. Si algo está mal (una fecha, un enlace que no empieza con `https://`), lo dice, lleva al campo y no deja publicar. La primera vez ofrece hacerla visible.
7. **Historial:** quién publicó la versión que ven los invitados y las 50 de antes, cada una con quién la publicó y cuándo. "Restaurar" trae una al borrador para revisarla y publicarla.
8. **Descargar o importar:** `invitacion.csv`, Excel (con una hoja `guia` que explica cada campo) o zip con la invitación y su `media/`. Lo importado queda en el borrador. También acepta el Excel del formato anterior.
9. **Dos ventanas (o dos personas) a la vez:** si las dos cambian la misma invitación, la segunda que guarda pregunta si cargar lo de la otra o conservar lo suyo.
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
| `colores` | La paleta, en hex: `fondo`, `texto`, `primario`, `primario_fuerte`, `primario_claro`, `acento`, `acento_suave`, `acento_fuerte` (el azul de los botones del panel), `superficie`, `marco` y `papel` (el de las franjas claras de las secciones difuminadas). Puedes inventar otros (`lino`) |
| `fuentes` | Letras de Google Fonts por rol: `script` (títulos manuscritos), `script_mono` (frases), `serif` (párrafos y datos), `caps` (etiquetas en mayúsculas), `display` (la fecha grande y los números), `button` y `engraved` (las mayúsculas finas de la imagen para WhatsApp) |
| `textos` | Letra, color y tamaño de **todos** los títulos, subtítulos, textos y botones (ver "Letra, color y tamaño") |
| `pagina` | `fondo` (la imagen detrás de toda la invitación), `decoracion` (las mariposas o el confeti que cruzan la pantalla: SI/NO), `difuminar` (SI: secciones difuminadas, sin cortes; ver "Fondos, efectos y escritorio") y los detalles de diseño de toda la invitación (tabla de abajo) |

**Detalles de diseño de la página** (`pagina`; vacíos, los pone el tema). Sirven en cualquier tema y toman los colores de la paleta:

| Campo | Valores |
|---|---|
| `orilla` | La división entre secciones (la orilla de las franjas con secciones difuminadas): `degradado`, `hoja` (rasgada), `ciudad`, `ola`, `feston` o `recta`. Cada sección puede cambiar la suya con su propio `orilla` |
| `botones` | El estilo de todos los botones: `degradado`, `solido`, `contorno`, `deco` (doble filo), `boleto` (con muescas), `neon` o `texto` (subrayado) |
| `confeti` | `SI`/`NO`: papel metálico que cae |
| `metalico` | `SI`/`NO`: títulos, nombre, fecha y números con brillo de metal |
| `esquinas` | Las esquinas de los paneles: `deco` (escalonadas) o `ninguna` |

### `evento`

| Grupo | Campos |
|---|---|
| Evento | `tipo` (`xv`, `boda`, `graduacion`, `bautizo`, `cumple`, `otro`), `tema` (`jardin-azul`, `marfil`, `nueva-york`, `encaje` o `lacre`), `festejada`, `festejada_corto` (el nombre del sobre), `monograma` (las iniciales del sello y del monograma, de una a tres letras: `I M`; vacío, salen del nombre corto: "Isabella & Mateo" → I M), `pareja`, `subtitulo` ("mis xv años"), `titulo` (el de la pestaña del navegador), `inicia` (AAAA-MM-DD HH:MM) y `zona_horaria` |
| Salón | `salon`, `salon_nombre_visible`, `salon_ciudad` (también la usa el clima), `salon_direccion`, `salon_maps` (`https://…`), `salon_foto` y `clima_coordenadas` |
| Confirmaciones | `rsvp_modo`, `rsvp_limite`, `rsvp_whatsapp`, `rsvp_pedir_cancion` y `rsvp_pedir_mensaje` |
| Música | `musica_fuente`, `musica_audio`, `musica_inicio` y `spotify` |
| Compartir | `mensaje_whatsapp`, `titulo_panel` y la imagen que se manda por WhatsApp: `tarjeta_fondo` (un fondo de `media/` con el sobre al centro), `tarjeta_frase` y `tarjeta_texto` (dos frases opcionales arriba de la fecha, como "Celebremos juntos" / "esta etapa tan especial") |

Estos datos van en `evento` porque los usan varias partes: la portada, el calendario, el clima y el PDF del panel. En el gestor aparecen dentro de la sección donde se ven.

`clave_panel` y `publicado` **no** van aquí: están en `ajustes.csv`.

### Secciones

Los tipos, en el orden de la invitación de NAT (`historia` e `informacion` se agregan donde se quieran). Solo `foto`, `frase`, `cierre` y las demás marcadas «repetible» se pueden repetir (`frase-2`, `foto-2`, `video-2`…). Los nombres viejos (`sobre`, `familia`, `hoteles`…) se aceptan al leer y se guardan con su nombre de hoy.

| Sección | Campos propios | Elementos de su lista | Datos de `evento` que muestra | Adornos (`imagen_…`) | Textos propios |
|---|---|---|---|---|---|
| `portada` | `boton` ("Toca para abrir"), `variante` | — | `festejada_corto`, `festejada`, `subtitulo`, el salón | `sobre`, `tarjeta`, `flores`, `corona`, `mariposas`, `lacre`, `puerta` | `nombre` (el grande), `lugar`, `para` (el nombre en el sobre) |
| `musica` | `titulo` | — | `musica_fuente`, `musica_audio`, `spotify` | — | — |
| `bendicion` | `texto`, `subtitulo` | `rol`, `nombres` (uno por línea): "Mis papás", "Mis padrinos" | — | `arco`, `hojas`, `divisor`, `lazo` | `rol`, `nombres` |
| `fecha` | `titulo` | — | `inicia`, `zona_horaria` (el calendario sale de ahí) | `destellos` | `fecha`, `calendario` |
| `foto` | `imagen` (recortada sin fondo), `titulo` (unas iniciales o un apodo en la esquina) | — | — | `marco`, `estrellas`, `mariposas` | — |
| `ubicacion` (repetible: una sección por lugar o varios lugares en una) | `titulo`, `boton`, `variante`, `acomodo` (`lado a lado`, que en el celular se apila, o `uno debajo del otro`), `calendario` (`SI`/`NO`: botón «Agregar al calendario» en cada lugar con `hora`, el día del evento) | Varias ubicaciones (misa y recepción): `tipo` (`ceremonia religiosa`, `ceremonia civil`, `recepcion`, `ceremonia y recepcion`, `otro`: pone etiqueta e ícono por defecto; `etiqueta` gana si se escribe), `etiqueta`, `lugar`, `hora`, `direccion`, `maps`, `foto` | El salón: `salon`, `salon_nombre_visible`, `salon_ciudad`, `salon_direccion`, `salon_maps`, `salon_foto` | — | `etiqueta`, `lugar`, `detalle` |
| `frase` | `texto` | — | — | `divisor` | — |
| `itinerario` | `titulo`, `variante`, `en_vivo` (`SI`: el día del evento, en su zona horaria, resalta «Ahora» y «Sigue» y atenúa lo pasado; una hora menor que la anterior cuenta como del día siguiente) | `hora` (`17:00` o `5:00 pm`), `actividad`, `icono` | — | `marco`, `estatua`, `puente` | `hora`, `actividad` |
| `vestimenta` | `titulo`, `subtitulo`, `texto`, `restricciones` (qué evitar, una por línea, hasta 6), `colores` (de 1 a 4 hex, separados por espacio), `variante`, `enlace` (https; es el botón «Ver ejemplos» del `muestrario`: sin enlace, no aparece) y `boton` | `referencias`: hasta 4 fotos de `media/` (`foto`, `pie` opcional) | — | `lacre`, `tarjeta`, `mujer`, `hombre` | — |
| `sin_ninos` | `titulo`, `subtitulo` (la etiqueta "Solo adultos"), `texto` | — | — | `lazo` | — |
| `clima` | `titulo`, `texto` | — | `salon_ciudad`, `clima_coordenadas` | — | `lugar`, `datos` |
| `hospedaje` | `titulo`, `subtitulo`, `texto`, `boton` | `nombre` (obligatorio), `nota`, `direccion`, `maps`, `telefono`, `foto` y, opcionales, `distancia` ("A 10 min del salón"), `precio` y `reserva` (https; si no lo es se avisa y se quita). Solo se ven si se llenan | — | `tarjeta`, `divisor` | `nombre`, `nota`, `direccion` |
| `mesa_regalos` | `titulo`, `texto`, `boton` ("Ver mesa"), `variante`; lluvia de sobres: `sobres_titulo`, `sobres_texto`, `banco`, `cuenta` (CLABE o tarjeta), `titular`, `sobre_fisico` (SI: "también habrá caja en el salón") y `solo_con_enlace` | `tienda` (`liverpool`, `amazon`, `palacio`, `sears`, `costco` u `otra`), `nombre` (si es otra), `nota`, `enlace`, `numero_evento` | — | — | `tienda`, `sobres`, `cuenta` |
| `playlist` | `titulo`, `subtitulo`, `texto`, `boton`, `variante` | — | `spotify` | — | — |
| `cuenta_regresiva` | `titulo`, `texto` | — | `inicia` | `corona`, `mariposa` | `numeros`, `unidades` |
| `confirmacion` | `titulo`, `subtitulo`, `boton` | — | `rsvp_modo`, `rsvp_limite`, `rsvp_whatsapp` | `tarjeta`, `flores` | `fecha_limite` |
| `dedicatoria` | `titulo`, `texto`, `boton`, `muro` (`SI`: muestra las dedicatorias recibidas; `NO` por defecto) | — | — | `divisor` | `mensaje`, `autor` |
| `album` | `titulo`, `texto`, `boton`, `album_dias` (5 a 20, 5 por defecto), `album_max_mb` (300 por defecto) | `foto` (fotos de ejemplo, solo para muestras) | — | `marco`, `divisor` | `titulo`, `texto`, `boton` |
| `trivia` | `titulo`, `texto`, `boton`, `cierra`, `variante` | `pregunta`, `opcion_1` a `opcion_4`, `correcta` | — | `divisor` | `pregunta`, `opcion`, `resultado` |
| `video` (repetible) | `titulo`, `texto`, `fuente` (`youtube`, `archivo`, `instagram`, `facebook`), `enlace`, `archivo` (un `.mp4` de `media/`), `poster` (imagen de `media/`), `formato` (`horizontal` 16:9 o `vertical` 9:16), `boton` (texto de "Ver en…"), `variante` (`encaje`: óvalo con perlas) | — | — | `divisor` | `titulo`, `texto` |
| `publicacion` (repetible) | `titulo`, `texto`, `red` (`instagram`, `facebook`, `youtube`), `enlace`, `poster`, `boton`, `variante` (`encaje`) | — | — | `divisor` | `titulo`, `texto` |
| `historia` (repetible) | `titulo`, `subtitulo`, `texto` (mensaje de bienvenida), `variante` | `momentos`, hasta 8: `anio`, `titulo` (obligatorio), `texto`, `foto` (opcional) | — | `divisor` | `anio`, `momento`, `detalle` |
| `informacion` | `titulo`, `subtitulo`, `texto`, `variante` | `preguntas`, hasta 12: `pregunta`, `respuesta` (acordeón accesible) | — | `divisor` | `pregunta`, `respuesta` |
| `cierre` | `titulo`, `texto` | — | — | `flores`, `corona` | — |

**Íconos del itinerario** (`icono`): un archivo de `media/` (`copas.webp`) o un nombre: `utensils`, `church`, `crown`, `music`, `heart`, `ring`, `dove`, `gift`, `cake-candles`, `graduation-cap`, `door-open`, `champagne-glasses`, `location-dot`, y los de Nueva York: `statue-of-liberty`, `brooklyn-bridge`, `empire-state`, `disco-ball`, `taxi`, `martini-glass-citrus`, `city`.

**Mesa de regalos** (`mesa_regalos`): cada tienda con su monograma, el número de evento (con botón para copiar) y el botón a la mesa; la lluvia de sobres con la cuenta de 4 en 4 (también para copiar). Con `solo_con_enlace` (encendido si no se escribe), **los datos bancarios solo llegan a las invitaciones personales** (`/i/<token>`): el servidor los quita del enlace general, que avisa "vienen en tu invitación personal". Sin tiendas ni lluvia de sobres, la sección no aparece.

**Diseños de sección** (`variante`): además del de siempre, estas secciones tienen diseños alternos que **sirven en cualquier tema** (con sus colores y sus letras; sus dibujos salen del tema o, si no trae, de los compartidos). Nacieron para `nueva-york`, que los usa todos por defecto; `clasica` vuelve al de siempre:

| Sección | `variante` | Cómo se ve |
|---|---|---|
| `portada` | `elevador` | Puertas de elevador art déco; al tocar, la aguja recorre los pisos y se abren (adorno `puerta`) |
| `musica` | `vinilo` | Un tocadiscos: el disco gira mientras suena |
| `bendicion` | `programa` | El programa de mano de un estreno de Broadway, con el "reparto" |
| `fecha` | `boleto` | Boleto plateado con su talón y la semana del evento |
| `foto` | `ventana` | La foto en la punta escalonada de un rascacielos, con la ciudad detrás |
| `ubicacion` | `metro` | Letrero de estación del metro; la foto en marco de mosaico |
| `frase` | `neon` | Letrero de neón que parpadea y se enciende |
| `itinerario` | `avenida` | Línea del metro en un poste con farol, letreros de calle; al pie, la Estatua y el puente de Brooklyn |
| `vestimenta` | `vitrinas` | Escaparates de la Quinta Avenida |
| `sin_ninos` | `cordon` | Cordón de terciopelo con su letrero |
| `cuenta_regresiva` | `tablero` | Tablero de llegadas de Grand Central (las paletas caen) |
| `hospedaje` | `colgantes` | Colgantes de puerta de hotel |
| `mesa_regalos` | `bolsas` | Bolsas de compras y un sobre déco |
| `confirmacion` | `pase` | Pase VIP colgado de su cinta |
| `dedicatoria` | `postal` | Postal de correo aéreo con timbre de la Estatua |
| `cierre` | `marquesina` | Marquesina de Broadway con focos que corren |

**Campos de cualquier sección:**

- Textos: `titulo`, `subtitulo`, `texto`, `boton`.
- Diseño: `variante`, `fondo`, `fondo_ajuste`, `color_fondo`, `overlay`, `fijo`, `efectos`, `orilla` (la forma de sus orillas cuando es franja), `escritorio`.
- `color_<color>`: colores propios de la sección (`color_primario`, `color_texto`…). Con alguno, la sección usa su propia paleta y lo que no cambies sigue a la de toda la invitación.
- `imagen_<adorno>`: cambia una imagen del tema solo en esa sección (`imagen_sobre`, `imagen_marco`). El valor `ninguna` la quita.
- Estilo de cada texto: `<bloque>_fuente`, `<bloque>_color` y `<bloque>_tamano` (abajo).

Cada sección se pinta como un **panel** con su propio fondo y el mismo espacio entre todas (la portada va sin panel). Las que no traen `fondo` ni `color_fondo` se turnan los fondos del tema, así dos seguidas nunca se ven iguales. Con **secciones difuminadas** (`pagina` → `difuminar`, o el efecto `difuminar` en una sola) no hay paneles: ver abajo.

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
- Los del tema `nueva-york` (sirven en cualquier tema y toman los colores de la paleta):
  - `horizonte` (o `ciudad`): Manhattan al pie de la sección (Empire State, Chrysler, One World Trade Center, el puente de Brooklyn…) en tres capas que avanzan a distinta velocidad; las ventanas se encienden a destiempo. En la portada llega a la orilla de la pantalla.
  - `reflectores`: haces de luz que barren el cielo desde abajo, como en un estreno.
  - `luces`: luces suaves y desenfocadas que flotan detrás.
  - `escarcha` (o `brillitos`): brillitos que caen despacio.
  - `reflejo`: de vez en cuando una luz cruza la sección; aviva solo lo claro (letras y filos plateados).
  - `panoramica` (o `paneo`): la imagen de fondo de la sección se desliza de lado a lado (para una foto de la ciudad).
  - `bola_disco` (o `disco`): bolas de espejos colgadas que giran, con rayos, destellos y sus reflejos recorriendo la sección.
  - `luces_disco` (o `reflejos_disco`): solo los reflejos, puntos de luz que cruzan la sección.
- Los de tela y encaje (tema `encaje`; sirven en cualquier tema):
  - `encaje_giratorio`: carpetas de encaje que giran muy despacio en las esquinas.
  - `encaje_ondulante`: las orillas de encaje arriba y abajo se mecen como tela con brisa.
  - `encaje_dibujado`: una flor de encaje se dibuja trazo a trazo al llegar a la sección.
  - `foco` (o `foco_escenario`): luz de escenario; los bordes se oscurecen y un haz cae sobre el centro (frase, video, música).
  - `foco_viaja`: el haz de luz recorre la sección de lado a lado.
  - `perlas_destello`: un collar de perlas al borde con un destello que lo recorre.
  - `satin_brillo` (o `saten`): un barrido de brillo de satén cruza el fondo.
  - `cortinaje_mece`: guirnaldas de gasa con perlas que se balancean arriba.
  - `perlas_cuelgan`: hilos de perlas que caen al entrar y se balancean.
  - `petalos`: pétalos blancos que caen muy despacio.
  - `polvo_luz` (o `polvo`, `luciernagas`): motas de luz que suben lentamente.
  - `tul_respira`: velos de tul en las orillas que respiran.
  - `bordado_aparece` (o `bordado`): el título aparece de a poco y se cose una línea de puntadas debajo.
  - `respira`: el panel crece y se encoge apenas.
- Los de texto (tema `lacre`; sirven en cualquier tema). Animan el título de la sección (en la portada `sobre-lacre`: el encabezado, los nombres y el "&"); el texto real siempre está en la página para los lectores de pantalla y con "reducir movimiento" sale completo:
  - `maquina_escribir`: el título se escribe letra por letra con un cursor de tinta (en la portada, el encabezado).
  - `sello_estampado`: las letras caen una tras otra y se asientan como un sello (en la portada, los nombres).
  - `tinta_seca`: las letras aparecen húmedas, en el color de acento, y se secan en la tinta.
  - `caligrafia`: el título se descubre de izquierda a derecha como si lo escribiera una pluma (en la portada, el "&").
  - `pan_de_oro`: un brillo dorado recorre el título, el monograma y los lacres de la sección cada tanto.
  - `letterpress`: el título se imprime al llegar, como presionado contra el papel (sirve en cualquier sección, aunque su diseño no tenga los demás).
- `difuminar` (o `sin_cortes`, `integrar`): la sección deja de ser tarjeta (ver abajo).
- `ninguno` apaga los que el tema trae por defecto (no quita `difuminar` si la página lo pide).

Si la sección trae efectos, reemplazan a los del tema; vacía, se usan los del tema.

Sin configurar nada, el tema también pone mariposas que cruzan la pantalla de vez en cuando (`pagina` → `decoracion`), pétalos y confeti al abrir el sobre y al confirmar asistencia, el corazón y las barras del reproductor que se mueven con la música, y el segundero que late. Todo se apaga si el celular tiene activado "reducir movimiento".

**Secciones difuminadas** (`pagina,,difuminar,SI`, o el efecto `difuminar` en una sección): ninguna sección se ve como tarjeta; llegan a las orillas y se tocan, sin espacio entre ellas. Las que tienen color de fondo (`color_fondo`) son **franjas**: sus orillas de arriba y abajo se funden con lo que sigue. En `nueva-york` la ciudad corta las franjas grises (`color_fondo,marco`) y el **papel** (`color_fondo,papel`) asoma por una hoja rasgada, con la fibra y la sombra de la hoja negra; adentro de una franja de papel todo va en tinta. En otros temas la orilla es un degradado. Las que no tienen fondo van directo sobre el papel de la página.

**Tema `nueva-york`:** una noche en Manhattan, de fondo negro. Sus adornos son dibujos (sobre perla, tarjeta negra con marco art déco, la corona del Chrysler, un sello con el Empire State); los paneles llevan esquinas escalonadas y los títulos brillo de metal. Cada sección tiene su propio diseño (tabla de "Diseños de sección"), bendición, itinerario, cuenta regresiva y confirmación van sobre papel, y ubicación y mesa de regalos en franja gris; en lugar de mariposas cae confeti plateado. Su plantilla está en `deploy/plantillas/nueva-york/` (`deploy/plantillas/instalar.sh nueva-york` la pone aquí; `deploy/plantillas/subir.sh nueva-york`, en Fly) y ya viene con secciones difuminadas. Al ser oscura, el panel del dueño y la imagen para WhatsApp van en su versión oscura (el QR, en una placa clara para que se lea).

**Escritorio** (`escritorio`): `completo` ocupa toda la fila; `mitad` se pone junto a la siguiente sección `mitad`. Una `mitad` sin pareja se queda con la fila completa. Vacío = lo que diga el tema (en `jardin-azul`: fecha | foto, ubicación | frase, itinerario | vestimenta, cuenta regresiva | confirmación).

### Música, playlist, clima y dedicatoria

**Música**: lo que suena al abrir el sobre sale de una de dos fuentes (`musica_fuente`):

- `archivo`: `musica_audio` es el nombre de un MP3 en `media/` (ideal ≤ 3 MB). Sin MP3, el reproductor se ve pero sus botones quedan desactivados.
- `musica_inicio` (solo con MP3): segundo en que empieza la canción, entero de 0 a 36000 (vacío o 0 = desde el principio; 45 se salta la intro). Debe ser menor que la duración del MP3: el gestor la muestra al elegir el archivo, el servidor la lee de las cabeceras del MP3 y rechaza un inicio que no cabe, y el reproductor ignora un valor mayor a la duración. Al repetir, la canción regresa a ese segundo. Con Spotify se ignora.
- `spotify`: suena la playlist (o la canción) de `spotify` (el enlace de Compartir → Copiar enlace). El reproductor de Spotify aparece en la sección `playlist` (o, si no hay, debajo del reproductor `musica`) y los controles dorados y el botón flotante lo manejan. Quien no tiene sesión de Spotify en ese navegador oye muestras de 30 s por canción; en iPhone, Safari puede pedir tocar ▶ en el reproductor (la invitación lo avisa).

Sin `musica_fuente`: se usa el MP3 si hay; si no hay MP3 pero sí playlist, Spotify. Con MP3, la `playlist` es un reproductor aparte (al tocarlo se pausa la canción de la invitación).

**Playlist** (`playlist`): la playlist de `spotify` con su lista de canciones, como la comparte Spotify. Se puede tocar: play, pausa, elegir canción y recorrer la lista dentro del reproductor. `variante`: `completa` (por defecto, se ven unas 7 canciones), `lista` (3, el tamaño estándar de Spotify) o `compacta` (solo portada y botón). Sin enlace válido de Spotify la sección no aparece.

**Clima** (`clima`): el clima del día del evento en la ciudad del salón (`salon_ciudad`, por ejemplo "Pachuca, Hidalgo"; o `clima_coordenadas` como `20.1170, -98.7333` para más precisión). Mientras faltan más de 16 días muestra el clima típico de esa fecha (promedio de 10 años); desde 16 días antes, el pronóstico real, que se renueva cada 30 minutos. Incluye la temperatura en las horas de la fiesta y un consejo (abrigo, paraguas). Se quita sola un día después del evento. Datos de Open-Meteo. En la vista previa del gestor sale un ejemplo hasta que la invitación se publica.

**Dedicatoria** (`dedicatoria`): nombre y mensaje (`titulo`, `texto` y `boton` cambian los textos). **Una por enlace**: ya enviada se ve fija y no se puede cambiar; se guarda en `dedicatorias.csv` y la ves en el panel. No depende de la fecha límite. En la invitación general (`/e/<slug>`) pide abrir el enlace personal. **Muro** (`muro,SI`): debajo del formulario se ven el nombre y el mensaje de las dedicatorias recibidas (las más recientes primero, hasta 60), que la invitación lee de `GET /api/public/events/<slug>/dedications`; nunca salen el enlace, el `para` ni la fecha. Para quitar una, se elimina su invitación desde el panel (pasa a `dedicatorias-eliminadas.csv`). En una muestra (`demo`) el muro va vacío.

**Video y publicación de redes** (`video`, `publicacion`): el `enlace` debe ser `https` y de **YouTube** (`youtube.com`, `youtu.be`, también Shorts), **Instagram** (reel, post o video) o **Facebook** (video, reel o publicación); cualquier otro dominio, `http`, `javascript:` o un enlace con usuario o puerto se reporta como error y la sección no se muestra. El servidor saca el id y arma las direcciones (`SocialEmbed`); lo que se escribió nunca viaja tal cual. Con `fuente = archivo`, `archivo` es un **MP4 (H.264) de la biblioteca**, de **hasta 40 MB**, que se sube tal cual (sin re-codificar) en la pestaña «Videos»; Apache lo sirve con `Range`. La portada (`poster`) debe ser una imagen de la biblioteca: **nunca** se pide la miniatura de YouTube ni ninguna imagen de afuera. **Fachada:** al abrir la invitación no se hace ninguna petición a YouTube, Instagram ni Facebook (ni a sus CDNs); el reproductor (iframe `youtube-nocookie.com`, `blockquote` + `embed.js` de Instagram, plugin de Facebook) se carga solo al tocar play, y ese toque pausa la música de la invitación. Si la red lo bloquea o tarda más de 10 s, queda el botón «Ver en Instagram». En una muestra (`demo=SI`) se ve igual.

**Trivia** (`trivia`): hasta **10 preguntas**; cada una lleva `pregunta`, de 2 a 4 opciones (`opcion_1` a `opcion_4`, en orden y sin huecos) y `correcta`, el **número** de la opción correcta (1 a 4). `cierra` (fecha, o fecha y hora; una fecha sola cierra al terminar ese día) es opcional: sin ella cierra cuando empieza el evento. **La respuesta correcta nunca sale en la invitación**: el servidor califica. Cada enlace responde **una vez** con su nombre; se guarda en `trivia.csv` (`respuestas` son los números elegidos separados por `;`) y los `segundos` los mide el servidor desde que se abrió la trivia (`trivia-inicios.csv`). Ya respondida o cerrada, el enlace da `409`. En una muestra (`demo=SI`) califica pero no guarda nada. En el panel, la pestaña **Trivia** muestra el ranking (más aciertos y, en empate, menos segundos) y lo descarga en CSV.

**Álbum** (`album`, una por evento): los invitados suben fotos desde su enlace (`/i/<token>`). Calendario en la zona horaria del evento: antes del día del evento no se sube; desde las 00:00 de ese día sí (**2 fotos por invitación**; si el dueño rechaza una, ese lugar se libera); a partir del día siguiente se cuentan `album_dias` días (de 5 a 20; el servidor acota cualquier otro valor) en los que se sigue subiendo y la invitación muestra las fotos **elegidas** por el dueño (pestaña "Álbum" del panel: Elegir, Quitar, Rechazar y descargar .zip). Al terminar el último día se **borra el álbum completo** (`album/`, `media/album/`, anotado en `album.csv` como `borrada`) y `/e/` e `/i/` responden `410` "Este evento ya terminó. ¡Gracias por acompañarnos!"; el panel y los demás CSV se quedan. El cierre es perezoso (la primera petición después del cierre) o a mano con `php artisan album:cerrar <slug>`. Cada foto se reduce en el celular a 1600 px (JPEG 0.85) y el servidor la recodifica a WebP 1600 px q80 con miniatura de 480 px q72 y sin EXIF; se rechaza sin procesar lo de más de 8 MB o 4096 px; throttle de 6 subidas por minuto por IP y enlace; tope de espacio por evento `album_max_mb` (al llenarse, `507` con mensaje amable; el panel avisa al 80 %). En una **muestra** (`demo=SI`) se ve un álbum de ejemplo con las fotos de la lista `foto` y la subida se simula en el navegador: no se guarda nada ni cierra nunca.

## `ajustes.csv`

Lo que aplica **al instante**, sin pasar por "Publicar". Lo escribe la API (desde el gestor o el panel).

| Clave | Qué es |
|---|---|
| `clave_panel` | La clave del panel del cliente. El gestor genera una de 12 caracteres o más; el mínimo es 8. Si cambia, las sesiones abiertas del panel se cierran |
| `publicado` | `SI`/`NO`: si los invitados pueden abrir la invitación. Una invitación nueva nace en `NO` |
| `plantilla` | `SI`: es una plantilla. Nunca es pública (`/e/<slug>` responde 404) y no tiene panel |
| `rsvp_limite`, `rsvp_limite_cambios` | La fecha límite que el cliente movió desde su panel y cuántas veces (máximo 3). Gana sobre la de la invitación. Si publicas otra fecha, el gestor pregunta cuál dejar |
| `whatsapp_recordatorios`, `whatsapp_tope` | `SI`: el panel muestra los teléfonos y los recordatorios por WhatsApp (fase 12). Tope de mensajes del evento (300 si está vacío). Solo quien administra, en "Datos generales" |
| `recordatorio_cada_dias`, `recordatorio_permiso` | Los elige el cliente en su panel: cada cuántos días (0 = apagado; 2, 3, 5 o 7) y cuándo marcó que tiene permiso de sus invitados. Sin permiso no se manda nada |

El diseño nunca lleva la clave: descargar, copiar o hacer plantilla una invitación no la incluye.

## Plantillas

Una plantilla es un evento con `plantilla=SI`: el mismo formato y la misma carpeta, en su propia pestaña del gestor. Se crean con "Guardar como plantilla" desde la tarjeta de una invitación (copia su diseño y su media) y se usan desde "Nueva invitación". En el gestor, "Publicar" en una plantilla dice "Guardar plantilla": lo publicado es lo que copian las invitaciones nuevas.

### Eliminar

En el gestor, ⋯ → "Eliminar invitación", "Eliminar plantilla" o "Eliminar muestra". Solo quien administra.

- **Qué pasa:** deja de aparecer en el gestor. Una invitación, además, deja de abrir: su enlace general, los personales y el panel del cliente. Las invitaciones que se hicieron con una plantilla no cambian.
- **Confirmación:** una invitación visible, con enlaces generados o con personas que ya respondieron pide **escribir su dirección** (por ejemplo `nat`). Una recién hecha y oculta, o una plantilla, solo pide confirmar. El servidor revisa lo mismo.
- **Nada se borra:** la carpeta completa (enlaces, respuestas, dedicatorias, media y respaldos) pasa a `_gestor/papelera/<slug>-<fecha>/`. `_gestor/papelera/papelera.csv` anota quién la quitó, cuándo, qué era y cuántos enlaces y confirmados tenía.
- **Recuperar:** regresa esa carpeta a `eventos/` con su nombre de antes. En Fly: `fly ssh console -C "mv /data/eventos/_gestor/papelera/<carpeta> /data/eventos/<slug>"`.

Las del repositorio (`deploy/plantillas/`) se instalan con `deploy/plantillas/instalar.sh <nombre>` en local y `deploy/plantillas/subir.sh <nombre>` en Fly (`--forzar` la reemplaza allá por la versión del repositorio).

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
   - **eliminar**: pide confirmarlo ahí mismo (dice cuántos invitados y si hay dedicatoria). La invitación queda marcada en `invitaciones.csv` (columna `eliminada`; su número no se vuelve a usar) y su enlace deja de abrir; sus personas salen de `respuestas.csv` y su dedicatoria de `dedicatorias.csv`, y quedan en `respuestas-eliminadas.csv` y `dedicatorias-eliminadas.csv` por si hay que recuperarlas a mano.
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

# Cuentas del gestor (para entrar si nadie recuerda su clave)
docker compose exec api php artisan gestor:usuario                                    # lista
docker compose exec api php artisan gestor:usuario <usuario> --nombre="Su nombre" [--rol=admin]   # crea (da una clave temporal)
docker compose exec api php artisan gestor:usuario <usuario> --clave-nueva           # otra clave temporal
docker compose exec api php artisan gestor:usuario <usuario> --quitar-acceso         # o --dar-acceso

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

## Opciones del tema `encaje`

En el bloque `pagina` (y, donde se indica, en cada sección):

| Fila | Valores |
|---|---|
| `pagina,,orilla` / `<sección>,,orilla` | `encaje`: orilla calada de las franjas |
| `pagina,,esquinas` | `encaje`: rosetas de encaje en las esquinas de los paneles |
| `pagina,,botones` | `liston`: botón en forma de cinta de satén |
| `pagina,,textura` | `terciopelo`, `satin`, `gasa`, `lino`, `papel` o `ninguna`: trama de tela en el fondo de los paneles |
| `<sección>,,efectos` | `velo`: tul que ondea sobre la sección |

Diseños de sección nuevos (`variante`; sirven en cualquier tema):

| Sección | Valor | Diseño |
|---|---|---|
| `portada` | `telon` / `encaje` | Telón de terciopelo que se abre sobre un paisaje / sobre marfil con solapa de encaje |
| `portada` | `sobre-central` | Sobre marfil con costura al centro y perla (o lacre): al tocar, la mitad de arriba se levanta sobre la costura y la tarjeta sube desde adentro. Adornos: `imagen_tarjeta`, `imagen_lacre` e `imagen_papel` (textura del papel) |
| `fecha` | `calendario` | Mes en una tarjeta dentro de un sobre |
| `foto` | `camafeo` | Óvalo sobre carpeta de encaje |
| `vestimenta` | `muestrario` | Retazos de tela con los colores sugeridos |
| `mesa_regalos` | `etiqueta` | Etiquetas de papel rasgado con perforaciones |
| `cuenta_regresiva` | `corazon` | Corazón de encaje con los números |
| `cierre` | `bordado` | Tela arrugada, alcatraces y firma |

Adornos nuevos (`imagen_<adorno>`): `paisaje`, `cortinaje`, `telon`, `pliegues`, `tela`, `alcatraz` y `encaje`; `portada,,imagen` es el paisaje del telón.

### Diseños de la etapa 6b-2 (sirven en cualquier tema)

| Sección | `variante` | Diseño |
|---|---|---|
| `itinerario` | `grabado` | Hilo vertical con medallones de línea (copa, anillos, plato, pastel…): el dibujo sale del `icono` o de la actividad; con `en_vivo` marca «Ahora» y «Sigue» |
| `ubicacion` | `grabado` | Lámina oliva con la hacienda dibujada a línea, «Ver ubicación» y, con `calendario`, «Agregar al calendario» por lugar (`acomodo` y `tipo` como siempre) |
| `galeria` | `bastidor` | Fotos en aros de bordado con tela y puntada |
| `trivia` | `tarjetas` | Tarjeta de papel con encaje por pregunta (misma trivia) |
| `video`, `publicacion` | `encaje` | Marco ovalado con aro de perlas; sigue sin cargar nada de terceros hasta tocar play |

Adorno nuevo: `imagen_hacienda` (en `ubicacion`) cambia o quita el dibujo de la hacienda; `imagen_divisor` (en `itinerario`) el hilo de perlas. En `vestimenta`, `enlace` es el destino del botón de ejemplos y `boton` su texto; la plantilla `deploy/plantillas/encaje/` los trae todos.

## Piezas de papelería fina (silueta, filete, relieve, texturas y monograma)

Opciones reutilizables de cualquier tema (el tema solo pone sus valores en el manifest):

| Fila | Valores |
|---|---|
| `pagina,,silueta` / `<sección>,,silueta` | `muesca`: las esquinas de la tarjeta se recortan en cóncavo, como una tarjeta de papelería fina; `ninguna`. En la sección, vacío = la de la página |
| `pagina,,filete` / `<sección>,,filete` | `borgona`, `oro` o `ninguno`: línea fina por dentro de la tarjeta que sigue la silueta. Toma `--color-borgona` y `--color-oro` de la paleta (si no existen, el acento fuerte y el principal) |
| `pagina,,relieve` | `SI`/`NO`: títulos, nombres y fechas con letterpress estático (luz y sombra finas, sin animar) |
| `pagina,,textura` | además de las anteriores: `piedra` (beige con manchas suaves) y `algodon` (papel marfil con fibra) |
| `evento,,monograma` | iniciales del monograma y del lacre (ver arriba) |

La silueta y el filete aplican a los paneles (no a las secciones difuminadas ni a la portada).

## Diseños de papelería fina (tema `lacre`; sirven en cualquier tema)

El tema `lacre` los pone por defecto; cualquier invitación los pide con `variante`:

| Sección | `variante` | Diseño |
|---|---|---|
| `portada` | `sobre-lacre` | Sobre tradicional apaisado, de color (`--color-olivo`), con solapa triangular arriba, forro de damasco en relieve y lacre dorado con el monograma (con su brillo de pan de oro). Mientras está cerrado la página no se mueve (dedo, rueda ni teclas). Al tocar: el lacre se levanta, la solapa abre sobre su bisagra y queda parada detrás, la tarjeta sale del sobre, pasa al frente y crece mientras el sobre baja y se desvanece; queda solo la tarjeta con su lacre y un sello ovalado borgoña. Sus efectos de texto (`maquina_escribir`, `sello_estampado`, `caligrafia`) arrancan cuando la tarjeta llega. La tarjeta lleva `titulo` («Con todo el corazón»), los grupos de papás de `bendicion`, los nombres (de `festejada`, partidos por «&»), `texto` (la frase antes de la fecha), la fecha y la ciudad. Adorno `imagen_forro` (el damasco) |
| `musica` | `lacre` | Centrado: el lacre ES el botón, con el signo de play o pausa hundido en la cera; mientras suena late apenas y un anillo de puntos gira alrededor, y una línea de avance fina. Con Spotify, su reproductor suena sin verse y queda un enlace a la lista |
| `bendicion` | `editorial` | Mensaje en itálica entre filigranas y los grupos en columnas; si la portada es `sobre-lacre`, no repite a los papás |
| `historia` | `editorial` | Texto con capitular, la primera foto de los momentos en un marco de papel y los momentos en columnas |
| `historia` | `cronologia` | Compacta e interactiva (la del tema `lacre`): el mensaje con capitular y una línea de tiempo con los años como pestañas; un lacre pequeño viaja al año elegido y las tarjetas apiladas (foto, año, título y texto de cada momento) se cambian con un toque, con las flechas del teclado o deslizando el dedo. Sin foto, el momento lleva un sello |
| `fecha` | `editorial` | Tarjeta con muescas y filete: día de la semana, número grande, mes y año entre filetes, hora y «Agregar al calendario» |
| `ubicacion` | `papeleria` | Tarjetitas de papel por lugar con dibujo de línea (iglesia si el `tipo` es ceremonia religiosa, hacienda si no; `imagen_iglesia`, `imagen_hacienda`) y botones finos. En el celular, con `acomodo` lado a lado, cada tarjetita se acuesta (dibujo a la izquierda). Con el efecto `dibujo_vivo`, los dibujos de siempre se trazan al llegar y cobran vida (campanas, árboles, aves, ventanas encendidas) |
| `cuenta_regresiva` | `banda` | Franja de lado a lado con números en serif fina y el monograma tenue detrás |
| `itinerario` | `minuto` | Minuta: hora en versalitas, puntos y actividad; con `en_vivo` marca «Ahora» |
| `itinerario` | `sello` | Hilo en zigzag con un dibujo de línea por momento (iglesia, auto, copas, plato, pareja que baila, pastel, luna con fuegos…; sale del `icono` o de la actividad). Con el efecto `linea`, el hilo se entinta al bajar, un lacre con el monograma viaja por él y cada momento se enciende al pasar; con `en_vivo` marca «Ahora». Es el del tema `lacre` |
| `vestimenta` | `editorial` | Página de revista: el `subtitulo` como titular, paleta en muestras de papel, `restricciones` y `referencias` en marcos |
| `hospedaje` | `papeleria` | Fichas de hotel a lo ancho, con una llave de línea, número en romanos, nota y dirección; «Llamar» (si el hotel trae `telefono`), «Ver mapa» y «Reservar» (si trae `reserva`). No enseña `distancia` ni `precio` |
| `galeria` | `editorial` | Composición asimétrica (una grande, dos chicas, dos medianas) con marcos finos y pies numerados; abre el visor |
| `mesa_regalos` | `sobre` | Tarjeta que asoma de un sobre con las tiendas y la transferencia (misma privacidad) |
| `mesa_regalos` | `volteo` | Una tarjeta de lino por tienda (Liverpool, Amazon…) y otra por la transferencia, con un lacre y su inicial: los datos no se ven hasta tocarla; gira y el dorso enseña el número de evento (o de lista en Amazon) o la CLABE con «Copiar» y «Ver mesa». Por el enlace general, la de la transferencia no gira y avisa que los datos vienen en la invitación personal. Es el del tema `lacre` |
| `informacion` | `editorial` | Preguntas numeradas entre filetes |
| `confirmacion` | `tarjeta-rsvp` | Tarjeta de respuesta con muescas, filete y lacre pequeño; campos como renglones |
| `dedicatoria` | `muro` | Formulario en papel y las dedicatorias (con `muro,SI`) como notas en dos columnas. Sin `muro` (o con `NO`, como la boda de ejemplo) las dedicatorias solo se leen en el panel |
| `trivia` | `papeleria` | Cartas de papel con filete |
| `album` | `papeleria` | Tarjeta con muescas y una cámara de línea (`imagen_marco` la cambia) |
| `cierre` | `lacre` | Lacre grande borgoña con el monograma, mensaje, nombres y fecha |

Opciones nuevas: `pagina,,botones` = `fino` (contorno de un pelo, mayúsculas espaciadas); `efectos` = `tinta` (el título se asienta como tinta), `luz_rasante` (una luz baja cruza despacio), `papel_entra` (la tarjeta entra como sacada de un sobre) y `dibujo_vivo` (la iglesia y la hacienda de la ubicación se dibujan y cobran vida). La plantilla `deploy/plantillas/lacre/` trae todas las secciones del tema con textos de ejemplo.

