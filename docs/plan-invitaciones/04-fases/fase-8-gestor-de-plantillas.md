# Fase 8 — Gestor de plantillas y formato `invitacion.csv`

**Objetivo:** que cualquiera arme una invitación sin tocar Excel: secciones, orden, colores con selector, letras, imágenes, ubicaciones, textos y música, con la invitación a la vista mientras se edita. Y que todo siga en un archivo que se abre en Excel y se puede desarmar y volver a armar.
**Duración real:** 14-oct-2026 (y la etapa H, 15-oct).
**Rama:** `feature/gestor-plantillas`; unida a `main` y publicada en Fly el 15-oct (release v6), en GitHub desde el 16-oct.
**Referencias:** `eventos/README.md` (formato y uso), `../03-arquitectura-objetivo/api-contrato.md` (API del gestor), `../03-arquitectura-objetivo/frontend.md` (cómo está armado), `../06-despliegue/despliegue.md` (runbook de producción).

> **Estado (16-oct-2026): etapas A–E, G (una cuenta por persona), H (menos trabajo para el servidor) e I (arreglos y opciones de diseño) hechas, y en producción.** NAT está en el formato nuevo en local y en Fly (allá desde el 15-oct). La etapa F (limpieza) es después del 28-nov.
> Casillas: `[x]` hecho · `[x] ~~…~~ Cambió:` resuelto de otra forma · `[ ]` pendiente.

## Decisiones (14-oct)

| Tema | Decisión |
|---|---|
| Formato | Un solo archivo, `invitacion.csv` (`seccion, elemento, campo, valor`). `layout.xlsx` queda deprecado |
| Plantillas | Biblioteca de plantillas + eventos, en el mismo formato: una plantilla es un evento con `plantilla=SI` |
| Publicación | Borrador con autoguardado; los invitados ven los cambios hasta tocar **Publicar** |
| NAT | Migrar ya, con verificación automática, en una rama propia |
| Textos | Cada bloque de texto de cada sección con su letra, color y tamaño; el título separado del texto para combinarlos |
| Acceso | ~~Una clave maestra para todos~~ **Cambió (14-oct, noche):** una cuenta por persona, y el historial dice quién publicó qué. La clave maestra enciende el gestor y crea la primera cuenta |
| Plantillas de ejemplo | Ninguna por ahora: "solo me importa tener funcionando la de NAT" (pregunta 37) |
| Quién ve qué | Cada quien las suyas; quien administra ve y asigna todas; las plantillas son de todos (pregunta 40) |

## Etapas

### A. Formato, builders y migración (`db87e85`)

- [x] A0, bugs de antes: `LayoutReader::GENERATED` no excluía `dedicatorias`; `layout:xlsx` metía al Excel los CSV que escribe la app (con mensajes reales); `subir-evento.sh` no subía `hoteles.csv`.
- [x] `Design`, `DesignCodec`, `DesignFile` (csv y xlsx, Windows-1252 y `;`, hoja `guia`) y `Catalog` (17 tipos de sección con campos, lista, adornos, bloques de texto y la pista de por qué no se ve).
- [x] `InvitationConfigBuilder` (estricto o tolerante, con `issues` por sección, elemento y campo), estilos de texto, URLs solo `https://`, límites del diseño.
- [x] `LegacyLayoutConverter`, `ConfigComparator`, `LegacyMigrator` e `invitacion:migrar` (`--probar`, `--todos`, `--forzar`, `--limpiar`).
- [x] `DesignStore` (borrador bajo candado, 409, historial de 50, restaurar), `DesignPublisher` (estricto, respaldo, bitácora, regla de la fecha del cliente) y `EventSettings` (`clave_panel`, `publicado`, `plantilla`).
- [x] `EventRepository` lee primero el diseño; sin `invitacion.csv`, el camino de antes, congelado.
- [x] Punto de control: la suite anterior pasó sin editar pruebas; `invitacion:migrar --todos --probar` dijo "idéntica"; **NAT local migrado**; `/e/nat`, `/i/<token>` y `/panel/nat` iguales en capturas a 390 y 1440 px; los CSV del sistema con el mismo hash.

### B. Invitación y vista previa (`f5ee541`)

- [x] Adornos por sección (`imagen_<adorno>`, `ninguna` lo quita), `key`, colores por sección y tokens derivados con `color-mix` (dentro de `@supports`).
- [x] La pasada de estilos de texto por las 17 secciones: `var(--t-<bloque>-font|color|size)` con el valor de antes como respaldo, y `data-text` en cada texto.
- [x] Modo vista previa (`/gestor/vista-previa`) con su protocolo de mensajes (`previewProtocol.ts`), sobre abierto o cerrado, invitado general o personal de ejemplo, sin sonido.
- [x] Punto de control: NAT idéntico en capturas (salvo el ruido de animaciones), +1.4 KB gzip de JS y +0.6 KB de CSS en el bundle público.

### C. API del gestor (`92ac78c`)

- [x] Sesión con `GESTOR_CLAVE` (16+ caracteres, token de 12 h, 5 intentos/min), catálogo, eventos, borrador, publicar, descartar, historial, restaurar y ajustes.
- [x] Media: `ImageOptimizer` (WebP con transparencia, rotación EXIF, límite de megapíxeles), nombres únicos, `finfo` (nunca SVG ni HTML), "en uso en…", `nosniff`.
- [x] Descargar e importar: csv, xlsx (también el formato anterior) y zip con media; revisión de zip-slip, tamaño y cantidad de archivos.
- [x] ~~`upload_max_filesize=16M` y `post_max_size=20M`~~ **Cambió:** 60M y 64M, porque un MP3 llega a 20 MB y un zip con toda la media pesa más.
- [x] Encabezados: `X-Robots-Tag: noindex` y `frame-ancestors 'self'` en `/gestor*`.
- [x] Punto de control: pruebas Feature en verde; sin `GESTOR_CLAVE`, todo responde 403.

### D. UI del gestor (`26e2056`, `7d768b2`)

- [x] Entrada, invitaciones y plantillas (tarjetas con colores, letra, visible, cambios sin publicar y confirmados), nueva invitación (en blanco, plantilla o copia).
- [x] Editor en tres columnas: secciones (arrastrar, Alt + flechas, ocultar, agregar), vista previa, inspector armado desde el catálogo (Contenido y Diseño).
- [x] Estilo: paletas sugeridas, "crear desde mi color", selector de color (cuadro, matiz, hex, muestras y cuentagotas), aviso de poco contraste, letras por rol y combinaciones, textos de toda la invitación, fondo y decoración.
- [x] "Aa" por texto (letra, color, tamaño, restablecer, "usar en todas las secciones"); tocar un texto en la vista previa abre el suyo.
- [x] Al instante: paleta, colores de sección, color y tamaño de texto (el parche de estilo); lo demás llega con la config del servidor (~0.5 s).
- [x] Autoguardado (400 ms, máximo 2 s, una petición a la vez), deshacer y rehacer, conflicto 409, avisar antes de salir con cambios sin guardar, volver a guardar tras entrar de nuevo si la sesión venció.
- [x] Publicar (lista de cambios, errores con enlace al campo, hacerla visible la primera vez, pregunta por la fecha del cliente), descartar, historial, descargar e importar.
- [x] Datos generales: evento, salón, confirmaciones, música, mensaje con `{familia}` `{pases}` `{enlace}`, **la tarjeta para WhatsApp en vivo**, clave del cliente (con confirmación al cambiarla) y visible, al instante.
- [x] Biblioteca de imágenes y audio: arrastrar, avance de la subida, reducir en el navegador, "recortar aire transparente", espacio usado, "en uso".
- [x] Tableta (cajón) y celular (pestañas abajo). ~~Barra de abajo Secciones · Editar · Estilo · Ver~~ **Cambió:** Secciones · Editar · Ver; Estilo y Datos generales van arriba de la lista de secciones.
- [x] ~~`gestor.css`, `PreviewToolbar`, `SelectionOverlay`, `ImportExportDialog`, `styleVarsService`, `usePreviewBridge`, `useImageResize`~~ **Cambió de nombre o de lugar:** `manager.css` (el código va en inglés); la barra va en `PreviewFrame` y el contorno en `ManagerPreviewPage`; `TransferDialog`; `stylePatchService`; la escucha del iframe vive en `ManagerPreviewPage`; reducir fotos, en `useMediaLibrary` + `imageResizeService`.
- [x] Pruebas: cada servicio y composable nuevo (Vitest), y la página de la vista previa (tocar un texto manda `{sección, bloque}`; en "Probar" no).
- [x] QA a mano con capturas (escritorio, tableta y celular): copiar NAT, paleta al instante (120 ms), deshacer, letra/color/tamaño del título, reordenar, ocultar, agregar, publicar, historial, conflicto entre dos ventanas, "Ver como invitado", biblioteca, subir PNG con transparencia (queda WebP con alfa), SVG disfrazado rechazado, zip ida y vuelta idéntico.

### E. Documentos y producción

- [x] `eventos/README.md` reescrito: el gestor, `invitacion.csv` sección por sección, letra/color/tamaño, `ajustes.csv`, plantillas, editar sin el gestor, comandos y el formato anterior como apéndice deprecado.
- [x] Este archivo, `09-avance.md`, `08-decisiones-pendientes.md` (D12–D16), `api-contrato.md`, `frontend.md`, `modelo-datos.md`, `despliegue.md` y `CLAUDE.md`.
- [x] `deploy/subir-evento.sh`: siempre media/ y el layout anterior si lo hay; `invitacion.csv` solo con `--forzar`, respaldando antes la del servidor; avisa si hay un borrador allá.
- [x] `deploy/bajar-evento.sh` (nuevo): trae un evento del servidor a una carpeta nueva, sin pisar la local.
- [x] Probados los dos scripts con un `fly` simulado (el servidor en una carpeta temporal): no tocan respuestas, ajustes ni el borrador; con `--forzar` respaldan; bajar no sobrescribe.
- [x] **Runbook de producción, pasos 1 y 2** (15-oct): `GESTOR_CLAVE` y `fly deploy` (release v6). Producción ya tiene el gestor; ese día NAT seguía con su Excel (ya está migrada: abajo).
- [x] Pasos 3 y 7, revisados en el disco de Fly el 16-oct: tu cuenta existe (`_gestor/usuarios.csv`) y NAT ya está en el formato nuevo (`respaldos/publicaciones.csv`: "formato anterior", 15-oct a las 19:19 UTC). Allá NAT tiene un borrador sin publicar.
- [ ] Pasos 4–6 y 8 (respaldo, ensayo, revisión): no hay forma de comprobarlos desde aquí; si no los hiciste, el 8 sigue sirviendo (abrir `/e/nat`, una `/i/…` y `/panel/nat`).

### F. Limpieza (después del 28-nov-2026)

- [ ] Quitar `EventConfigBuilder`, `LayoutReader` como camino de lectura y `layout:xlsx`.
- [ ] Pasar las fixtures de pruebas al formato nuevo.
- [ ] Conservar `LegacyLayoutConverter` para importar Excel viejos.

### G. Cuentas por persona, quién ve qué, el sobre y el favicon (`1e4afad`, `e80b803`, `a42ef8d`, `656289c`)

- [x] `ManagerUsers` (`eventos/_gestor/usuarios.csv`: usuario, nombre, rol, activo, hash de la clave, clave temporal, creada y último acceso; "_gestor" nunca puede ser un evento) y `ManagerAuth` (token por persona; deja de servir si cambia su clave, si pierde el acceso o si cambia la clave maestra).
- [x] Primera cuenta con la clave maestra (`POST /setup`, solo sin cuentas); entrar con usuario y clave (mismo mensaje si el usuario no existe; tarda lo mismo); `GET /me` y cambiar mi clave (`PUT /me/password`, sesión nueva).
- [x] Personas (solo *Administra*, `manager.admin`): lista, agregar con clave temporal (se ve una vez), cambiar nombre o rol, clave temporal nueva, quitar o devolver el acceso. Nadie se quita el acceso ni el rol a sí mismo y siempre queda alguien que administra.
- [x] Quién hizo qué: `PublicationLog` (`respaldos/publicaciones.csv` con `usuario` y `nombre`; también al crear o copiar y al migrar desde la terminal) y `ajustes-historial.csv` (el dueño como `panel`). Las bitácoras viejas ganan la columna sin perder renglones (`CsvFile::append`).
- [x] Historial: quién publicó la versión que ven los invitados y cada una de antes ("Beto la publicó el…"); la tarjeta del inicio, quién publicó la última vez.
- [x] `gestor:usuario` (lista, crea, `--clave-nueva`, `--quitar-acceso`, `--dar-acceso`): para entrar si nadie recuerda su clave.
- [x] UI: entrada con usuario y clave, "Crea la primera cuenta", "Elige tu clave" (con la temporal), menú de la cuenta, "Personas del gestor" con el mensaje listo para mandar, "Cambiar mi clave"; las pestañas del mismo navegador siguen la sesión nueva.
- [x] Pruebas: `SessionTest` y `UsersTest` (API), `useManagerSession` y `managerAccountService` (web). QA a mano en escritorio y celular: primera cuenta, agregar a Beto, su clave, publicar, historial, quitarle el acceso (su sesión responde 401).
- [x] Favicon propio (el sobre del gestor) en lugar del de Vue: `favicon.svg`, `favicon.ico` (16, 32 y 48) y `apple-touch-icon.png`.
- [x] Cada quien las suyas (pregunta 40): `ManagerAccess` (`ajustes.csv` → `personas_gestor`), `manager.event` en todo `/events/{slug}/…` (403 "no está asignada a ti"), la lista filtrada, quien crea queda asignado, copiar solo lo que ves (las plantillas, todos), y "Quién la edita" en Datos generales (quien administra marca a las personas; quien edita ve quiénes la editan). `AccessTest`; QA con Ricardo y Beto.
- [x] Sobre en la vista previa (pregunta 38): "Ver como invitado" lo muestra cerrado aunque haya "reducir movimiento" y abre sin animación. `HeroEnvelopeSection.spec`; QA con el movimiento reducido emulado.

### H. El gestor le pide menos al servidor (15-oct: `247b1d7`, `7f0d492`, `1f574b9`, `ccaf682`)

Pedido: "que sea un 40 % más eficiente, más que nada por la demanda en el servidor", sin perder nada de lo que hace.

- [x] **API: cada operación lee la invitación una sola vez.**
  - `DesignState` y `StoredDesign`: el borrador y la publicada se leen una vez, y se descifran solo si alguien los pide.
  - La versión es la huella de los bytes del archivo. En lo que escribe el sistema es la misma de antes, así que una ventana abierta durante un deploy no se entera.
  - Guardar responde con lo que acaba de escribir, sin volver a leerlo. Antes, cada guardado leía y descifraba el borrador 5 veces y la publicada 2.
- [x] **API: menos trabajo repetido.**
  - `media()` arma la URL base una vez.
  - `ajustes.csv` y `usuarios.csv` se leen una vez por operación.
  - Las plantillas no cuentan invitados.
- [x] **API: respuestas que ahorran peticiones.**
  - `GET /events` trae también `user`: el inicio ya no pide `/me`.
  - `POST /publish` responde con el editor al día: ya no se pide el diseño otra vez.
- [x] **Editor: los textos se ven al instante.**
  - El parche de la vista previa (`previewPatchService`, antes `stylePatchService`) suma títulos, subtítulos, textos y botones de cada sección, y el título, los nombres y el salón del evento, con el `trim` de PHP.
  - La vista previa lo aplica una vez por cuadro.
- [x] **Editor: autoguardado con dos ritmos.**
  - Si la vista previa necesita al servidor para verse, 400 ms después de la última tecla (2 s como máximo), igual que antes.
  - Si ya lo muestra sola (estilo y esos textos), 1 s después (5 s como máximo).
  - Al ocultar la pestaña se guarda en ese momento.
- [x] **Editor: no se pide dos veces lo mismo.** El catálogo y las personas se piden una vez por página (`useManagerPeople`), y mis datos llegan con la lista.
- [x] **Producción (`deploy/`, sin deploy todavía).**
  - Apache entrega `/media` directo del disco, con 304 y rangos; Laravel solo ve lo que no coincide.
  - El JSON no se comprime en Apache: en producción se vio que el proxy de Fly ya lo comprime al salir, así que hacerlo aquí solo gastaba CPU (`ccaf682`). HTML, CSS y JS los sigue comprimiendo Apache, como antes.
  - `php artisan optimize`.
  - Las páginas (invitación, panel y gestor) ya no abren sesión ni mandan cookies que nadie usaba.
- [x] **Medido** con la imagen de producción en un contenedor de 1 CPU y 512 MB, con los datos en un volumen como el de Fly. La sesión de edición está guionada en Chrome sin ventana:
  - Arrastrar el color principal y el tamaño de los títulos.
  - Escribir un título y una frase.
  - Cambiar dos actividades y el nombre corto.
  - Ocultar, mover y agregar secciones.
  - Abrir la biblioteca, publicar y volver al inicio.

  Mediana de 3 corridas:

  | | Antes | Después | Cambio |
  |---|---|---|---|
  | Peticiones a PHP, con caché del navegador | 58 | 28 | −52 % |
  | Peticiones a PHP, primera vez (fotos sin caché) | 89 | 28 | −69 % |
  | Guardados del borrador | 45 | 19 | −58 % |
  | CPU por guardado (peticiones seguidas) | 10.1 ms | 6.9 ms | −32 % |
  | CPU por abrir el editor | 8.4 ms | 6.0 ms | −29 % |
  | CPU por foto | 3.7 ms | 0.5 ms | −85 % |
  | **Trabajo del servidor por sesión, con caché** (peticiones × su costo) | 520 ms | 177 ms | **−66 %** |
  | **Trabajo del servidor por sesión, primera vez** | 640 ms | 193 ms | **−70 %** |
  | CPU del contenedor en la sesión, con caché (medida directa) | 2.63 s | 1.56 s | −41 % |
  | CPU del contenedor en la sesión, primera vez (medida directa) | 2.82 s | 2.15 s | −24 % |

  En esta Mac (M1), una petición suelta gasta varias veces más CPU que en ráfaga, porque a veces cae en los núcleos de eficiencia. Eso tapa parte del ahorro en la medida directa, que además varía mucho entre corridas (la misma versión dio de 1.3 a 2.2 s). Por eso la comparación principal es el trabajo por sesión: las peticiones que hizo cada sesión, por el costo de cada tipo medido en ráfaga (mediana de 3, alternando versiones). En Fly (x86, sin esos núcleos) el ahorro debe quedar más cerca de esa cifra. Se midió con el JSON comprimido en Apache, que le sumaba ~0.5 ms a cada respuesta (por eso el catálogo sube de 3.0 a 3.7 ms); en producción eso ya no está porque lo comprime Fly, así que el costo real es un poco menor.
- [x] **QA en la imagen de producción (23/23):**
  - Media: 200 con ETag y `nosniff`, 304, rangos del MP3; `_gestor`, `originales/`, `.csv` y `.php` no se entregan.
  - HTML, CSS y JS con gzip.
  - El título se ve en la vista previa antes de guardar y se guarda al segundo.
  - Una actividad se guarda pronto; ocultar la pestaña guarda.
  - Sin errores de la página.
- [x] **Pruebas:**
  - API 178: `DesignStateTest`; guardar responde lo mismo que abrir; lista con `user`; publicar con el editor; páginas sin cookies.
  - Web 280: `previewPatchService`, `previewService`, `previewProtocol`, los dos ritmos en `useDesignEditor`, `useManagerPeople` y `setUser`.

### I. Arreglos y opciones de diseño (16-oct; en la release v10)

- [x] **Invitación en blanco sin vista previa:** se quedaba en "Cargando la vista previa…" porque PHP manda la paleta vacía como `[]`. `previewProtocol` la acepta y la normaliza (`normalizeConfig`; prueba en `previewProtocol.spec.ts`). Ver `bugs-y-riesgos.md` #27.
- [x] **Menú ⋯ de las tarjetas:** se pinta fuera de la tarjeta (`GPopover` con `Teleport`), porque la tarjeta que se levanta lo recortaba (#28).
- [ ] **Vista previa en blanco al elegir una sección:** no se reprodujo. Quedan tres medidas: en *Elegir* el iframe de Spotify no recibe el toque, el fondo es el del tema y las secciones lejos pausan sus efectos (#29, pregunta 46).
- [x] **Estilo → Página:** las opciones de toda la invitación salen solas de `Catalog::PAGE` (secciones difuminadas, división, botones, confeti, títulos metálicos, esquinas). Vacías, las pone el tema.
- [x] **Diseño de cada sección:** *Diseño* ofrece "Clásica" y los diseños alternos; *División con las vecinas* cambia la orilla de esa sección.
- [x] **Resto del editor:**
  - Íconos de Nueva York en el selector del itinerario, y el color `papel` en la paleta.
  - La vista previa en *Enlace general* esconde los datos bancarios de la mesa de regalos, como el servidor (`forGeneralLink`).
  - La sección `mesa_regalos` se agrega desde *Agregar*.
- [x] **Plantillas en producción:** `deploy/plantillas/subir.sh <nombre>`, que se corre desde tu Mac y no va en la imagen (probado con un `fly` simulado).

**Después de ver el gestor publicado (16-oct, tarde; falta `fly deploy`):**

- [x] **La plantilla de Nueva York, completa:** traía solo la portada; ahora trae las 18 secciones con su diseño y textos de ejemplo, sin datos de personas ni fotos (`deploy/plantillas/nueva-york/`). Validada, y revisada en capturas a 390 px. En Fly se actualiza con `deploy/plantillas/subir.sh nueva-york --forzar` (allá no tenía borrador).
- [x] **Eliminar plantillas:** ⋯ → "Eliminar plantilla", con confirmación. Solo quien administra y solo plantillas.
  - La carpeta no se borra: pasa a `_gestor/papelera/<slug>-<fecha>/`, con `papelera.csv` (quién y cuándo).
  - `DELETE /api/manager/events/{slug}` (`TemplateTrash`). Una invitación responde `422`: guarda enlaces y confirmaciones.
  - Pruebas: `EventsTest`. Probado en el navegador: el aviso, la tarjeta que se quita y la carpeta en la papelera.
- [x] **Pestaña "Muestras":** las muestras de la landing (`demo=SI`) ya no llenan "Invitaciones". La pestaña solo sale si hay muestras y avisa que los cambios publicados ahí los ven los clientes.
  - La lista trae `demo`; la lógica de las pestañas y la búsqueda, ahora también sin acentos, está en `managerHomeService` (con su prueba).
- [x] La tarjeta de una graduación dice "Graduación" (antes "Evento").

## Cómo se prueba

```bash
docker compose exec api php artisan test                  # 205 pruebas
docker compose exec web npm run test                      # 333 pruebas
docker compose exec web npm run lint && docker compose exec web npx vue-tsc --build --force
docker compose exec web npm run build
```

Para el gestor en local: `GESTOR_CLAVE` en `api/.env` (16 caracteres o más) y `http://localhost:5173/gestor`; la primera vez pide crear tu cuenta con esa clave. Para probar sin tocar NAT: "Nueva invitación" → "Copiar /e/nat", y borrar la carpeta `eventos/<copia>` al terminar.
