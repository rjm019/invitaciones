# Fase 8 — Gestor de plantillas y formato `invitacion.csv`

**Objetivo:** que cualquiera arme una invitación sin tocar Excel: secciones, orden, colores con selector, letras, imágenes, ubicaciones, textos y música, con la invitación a la vista mientras se edita. Y que todo siga en un archivo que se abre en Excel y se puede desarmar y volver a armar.
**Duración real:** 14-oct-2026.
**Rama:** `feature/gestor-plantillas` (sin push, merge ni deploy hasta que la revises).
**Referencias:** `eventos/README.md` (formato y uso), `../03-arquitectura-objetivo/api-contrato.md` (API del gestor), `../03-arquitectura-objetivo/frontend.md` (cómo está armado), `../06-despliegue/despliegue.md` (runbook de producción).

> **Estado (14-oct-2026): etapas A–E y G (una cuenta por persona) hechas en la rama; falta tu revisión.** NAT local ya está en el formato nuevo (la migración salió "idéntica"). Producción no cambió: el runbook corre solo cuando lo pidas. La etapa F (limpieza) es después del 28-nov.
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
- [ ] **Runbook de producción: solo cuando lo pidas** (`../06-despliegue/despliegue.md` → "Gestor: primera publicación").

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

## Cómo se prueba

```bash
docker compose exec api php artisan test                  # 171 pruebas
docker compose exec web npm run test                      # 266 pruebas
docker compose exec web npm run lint && docker compose exec web npx vue-tsc --build --force
docker compose exec web npm run build
```

Para el gestor en local: `GESTOR_CLAVE` en `api/.env` (16 caracteres o más) y `http://localhost:5173/gestor`; la primera vez pide crear tu cuenta con esa clave. Para probar sin tocar NAT: "Nueva invitación" → "Copiar /e/nat", y borrar la carpeta `eventos/<copia>` al terminar.
