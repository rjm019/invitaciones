# Fase 5 — Panel de administración, links, RSVP avanzado y pases PDF

**Objetivo:** que tú (o un cliente) creen eventos, generen links por familia y vean las respuestas sin tocar la base de datos.
**Duración estimada:** 2–3 días.

> **Estado (13-oct-2026): panel hecho, con otra mecánica; faltan pases PDF/QR.** A pedido tuyo, el panel es **por evento** (`/panel/<slug>`), se entra con la `clave_panel` del Excel y genera enlaces **por número de invitados**. Además tiene la lista completa de invitados con su mesa, se actualiza en vivo y permite cambiar la fecha límite hasta 3 veces. El evento se sigue editando en su Excel. Detalle en `../09-avance.md` y `../../../eventos/README.md`.
> Casillas: `[x]` hecho · `[x] ~~…~~ Cambió:` resuelto de otra forma · `[ ]` pendiente.

## Tareas

### Autenticación

- [x] ~~Login SPA con Breeze API + Sanctum.~~ **Cambió:** se entra con la `clave_panel` de la pestaña `evento` (mínimo 8 caracteres).
  - La sesión es un token cifrado de 12 h que se guarda solo en esa pestaña del navegador.
  - Si cambias la clave, las sesiones abiertas se cierran.
  - El login tiene throttle de 5/min y hay botón "Salir".
- [x] ~~Usuario administrador por seeder o tinker.~~ **Cambió:** no hay usuarios; la clave la pones tú en el Excel y no se versiona.

### Eventos

- [x] ~~Lista y alta de eventos.~~ **Cambió:** cada evento es una carpeta `eventos/<slug>/` con su `layout.xlsx`.
- [ ] ~~Editor del `config` con vista previa en vivo.~~ **Cambió:** se edita en el Excel y se recarga la página; los errores salen en español. *Un editor en el panel queda como idea para después.*
- [x] ~~Subida de medios desde el panel.~~ **Cambió:** los archivos se ponen en `eventos/<slug>/media/` y `media:optimizar` los pasa a WebP.
- [x] Publicar / despublicar: columna `publicado` (SI/NO) del Excel. Un evento sin publicar responde 404.

### Invitaciones (familias)

- [x] Lista de enlaces con:
  - Para cuántos invitados es cada uno.
  - Nombre opcional.
  - Quiénes confirmaron, con puntos por lugar.
  - Cuántas veces se abrió.
  - Fecha de alta.
- [x] Alta: escribes para cuántos invitados es (1 a 30) y, si quieres, el nombre que va en el sobre. ~~Edición, borrado y regenerar token.~~ *Borrar o editar un enlace es la pregunta abierta 12.*
- [x] ~~**Importar CSV** de familias.~~ **Cambió:** los enlaces se generan en el panel.
- [x] Copiar link (`navigator.clipboard`) y **botón de WhatsApp** (`wa.me` con el texto de `mensaje_whatsapp`).
- [ ] **QR** del link. *Pendiente (va con los pases).*
- [x] Buscador de invitaciones. *Ya no hay "estado" por familia; los filtros están en la pestaña Invitados.*

### Respuestas

- [x] **Totales:** enlaces, lugares, asistirán, no asistirán y lugares sin llenar.
- [x] **Agregado:** pestaña **Invitados**, con todas las personas, filtros (asistirán, no asistirán, sin mesa, lugares libres) y búsqueda por nombre o mesa.
- [x] **Agregado:** **mesas**, por persona o "Mesa para todos" por invitación, con conteo por mesa. Se guardan en `respuestas.csv`.
- [x] **Agregado:** **en vivo**. El panel revisa cada 5 s si algo cambió y se actualiza sin recargar.
- [x] **Agregado:** **fecha límite** cambiable hasta 3 veces (`ajustes.csv`).
- [x] Exportar CSV: los archivos del evento ya son CSV que se abren en Excel. `invitaciones:resumen` arma `resumen.csv`.
- [ ] ~~Lista de **canciones sugeridas** para el DJ.~~ *El formulario ya no pide canción (pregunta abierta 13).*
- [x] **Agregado (13-oct):** **dedicatorias**, una por enlace (sección `dedicatoria`, `dedicatorias.csv`, `POST /public/invitations/{token}/dedication`). Pestaña "Dedicatorias" en el panel, con buscador.

### Pases PDF con QR (repara el bug #4)

Todo pendiente (D9: después del evento real, o cuando lo decidas).

- [ ] `composer require barryvdh/laravel-dompdf simplesoftwareio/simple-qrcode`.
- [ ] `PassPdfService`: plantilla Blade con los colores del tema, nombre de la familia, asistentes y QR (contiene el token).
- [ ] `GET /public/invitations/{token}/pass.pdf`, disponible solo si `confirmed`.
- [ ] Botón "Descargar mis pases" en `RsvpCard` después de confirmar.
- [ ] Opcional: `POST /admin/check-in/{token}` + una pantalla de escaneo con la cámara (`html5-qrcode`) para la entrada al salón. *El buscador de `recepcion/` puede leer `respuestas.csv` con su mesa.*

### Pulido del RSVP

- [x] Resumen después de confirmar: los nombres enviados se ven fijos y los lugares que quedan siguen libres. ~~"Modificar".~~ **Cambió:** los nombres no se modifican (decisión tuya).
- [x] Mensajes de estado según la fecha límite, `429` y errores de red, en español.
- [x] `navigator.clipboard` en lugar de `execCommand` (bug #22), en `useClipboard`.

## Criterios de aceptación

- Flujo completo en menos de 3 minutos: crear evento → importar 20 familias → copiar link de WhatsApp → confirmar desde el celular → ver la respuesta en el panel → descargar el PDF. *Hecho sin el PDF, con el flujo nuevo: generar el enlace → copiar → confirmar desde otro navegador → verlo en el panel en 1 a 3 s.*
- Un usuario no ve eventos de otro. *Hecho: la sesión de un evento no sirve en otro.*
- Pruebas Feature del panel en verde. *Hecho: `AdminPanelTest`.*
