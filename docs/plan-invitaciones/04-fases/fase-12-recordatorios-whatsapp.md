# Fase 12 — Recordatorios del RSVP por WhatsApp

**Objetivo:** que cada enlace (invitación) tenga un teléfono de WhatsApp y que, cada cuántos días elija el cliente en su panel, se le mande un recordatorio automático a quien todavía no responde. Quien ya confirmó o dijo que no, sale de la lista. La función se enciende por evento desde el gestor.
**Planeada:** 26-oct-2026. **Pensada para NAT:** su RSVP cierra el 6-nov-2026.
(La fase 11 es la migración a Google Cloud y vive en la rama `feature/migracion-gcp`.)

> Casillas: `[x]` hecho · `[ ]` pendiente.

## Avance

> **26-oct: pasos 1 a 5 hechos (sin commit todavía ni `fly deploy`).** API: 261 pruebas en verde (29 nuevas); web: 391 (5 nuevas), lint y build en verde. Probado en local con un evento de prueba y `WHATSAPP_DRIVER=log`: teléfono al crear y editar, `422` con teléfono inválido o sin permiso, un envío y la segunda corrida sin enviar nada (idempotente). El panel de NAT, con la función apagada, se ve igual que antes (captura). Falta el paso 6: los trámites de Meta, los secretos y el deploy.

- [x] 1. Datos y reglas (API): columna `telefono` en `invitaciones.csv`, claves nuevas en `ajustes.csv` (no van en `MANAGED`: el diseño no las puede pisar), `ReminderPlanner`, `ReminderLog` y `ReminderRunner` en `api/app/Services/Reminders/`.
  - Un envío fallido que no es «sin WhatsApp» (131026) se vuelve a intentar al día siguiente, hasta la fecha límite. Un error del token o de permisos de Meta detiene la corrida sin marcar a nadie (`stopped`).
  - El webhook ignora el estado `sent`: la fila `enviado` ya la escribe el envío.
- [x] 2. Panel: teléfono al crear y editable en línea (al guardar, el foco pasa al siguiente vacío), estado de cada enlace («Enviado», «1 de 5»…) y tarjeta `ReminderCard.vue` junto a la fecha límite. Si hay teléfono, «Enviar» abre WhatsApp en ese chat.
- [x] 3. Gestor: «Datos generales» → «Recordatorios por WhatsApp» (interruptor, tope y «Enviados: N (≈ $X MXN)»), solo quien administra.
- [x] 4. Envío: `MetaWhatsAppChannel` y `LogChannel` (`WHATSAPP_DRIVER`), `php artisan recordatorios:enviar [--slug=] [--probar]`, `POST /api/internal/reminders/run` y el webhook `/api/webhooks/whatsapp`. Solo manda de 10:00 a 20:00 en la zona del evento (`--probar` lo ignora).
- [x] 5. Docs al día (`eventos/README.md`, `api-contrato.md`, `modelo-datos.md`, `despliegue.md`).
- [ ] 6. Puesta en marcha en NAT (trámites de Meta, secretos, deploy, cron, prueba).
- [ ] 7. Después del estreno: resumen de costos en el gestor, borrado de teléfonos 30 días después del evento y aviso de privacidad.

## Decisiones (26-oct)

- **Un número de Jiro Invitaciones**, con una sola cuenta de Meta, para todos los eventos. El mensaje nombra el evento («XV de Nat»), no a Jiro.
- **Solo envío automático con la API oficial de Meta** (WhatsApp Cloud API, directa). Sin modo manual `wa.me` y sin SMS de respaldo.
- **El teléfono lo escribe solo el cliente** en su panel. Para cumplir con el permiso que pide Meta, el cliente declara en el panel que tiene permiso de sus invitados; cada mensaje trae «Ya no recibir».
- **Se enciende por evento** desde el gestor, y solo quien administra puede hacerlo (cuesta dinero).

## Investigación

### Opciones

| Opción | Costo por recordatorio (México) | Veredicto |
|---|---|---|
| **Meta Cloud API directa** | Plantilla *utility*: 0.0085 USD (≈0.16 MXN). Si Meta la clasifica como *marketing*: 0.0397 USD (≈0.73 MXN). | **Elegida.** Sin intermediario ni mensualidad; basta el cliente HTTP de Laravel, sin SDK. |
| Twilio, Gupshup o 360dialog (proveedores de Meta) | La tarifa de Meta más 0.005 USD por mensaje (Twilio, también en los que llegan), o una mensualidad (360dialog). | Solo si Meta directo se complica: facilitan el alta, pero cobran encima. |
| Librerías no oficiales (Baileys, whatsapp-web.js) | 0 | **Descartadas**: violan los términos de WhatsApp y el número termina bloqueado. |
| SMS (Twilio ≈0.05–0.18 USD; SMS Masivos 0.47–0.90 MXN + IVA, según volumen) | De 3 a 6 veces más caro que WhatsApp; sin botones; los mensajes con enlace a veces se filtran | Descartado por el usuario. Queda como alternativa futura detrás de la misma interfaz `ReminderChannel`. |
| `wa.me` manual desde el teléfono del cliente | 0 | Descartado por el usuario (ya existe para mandar la invitación la primera vez). |

### Reglas de WhatsApp que moldean el diseño

- **Solo plantillas aprobadas.** Un mensaje que inicia el negocio (fuera de la ventana de 24 h que abre el invitado al escribir) tiene que ser una plantilla aprobada por Meta.
- **Plantilla propuesta** (`es_MX`, categoría *utility*):
  - Texto: «Hola {{1}}, te recordamos confirmar tu asistencia a {{2}} antes del {{3}}. Toca el botón para responder.»
  - `{{1}}`: el nombre del enlace (`para`), o «familia» si no tiene. `{{2}}`: el nombre del evento («XV de Nat»). `{{3}}`: la fecha límite efectiva («6 de noviembre»).
  - Botón URL dinámico: `https://invitaciones-jiro.fly.dev/i/{{1}}`, con el token del enlace.
  - Botón de respuesta rápida: «Ya no recibir».
- **Categoría.** Desde abr-2025, si Meta decide que una plantilla enviada como *utility* es *marketing*, la aprueba como *marketing* y la cobra a ese precio. Para que se quede en *utility*: solo recordatorio de algo que la persona ya tiene (su invitación), sin nada promocional ni la marca Jiro.
- **El dominio queda fijo en el botón.** Cambiarlo obliga a crear y aprobar otra plantilla. Se usa `invitaciones-jiro.fly.dev`, que es el dominio de los enlaces de NAT ya enviados; si se migra a GCP, la redirección 301 de la fase 11 lo cubre.
- **Permiso (opt-in).** Meta pide que la persona haya aceptado mensajes de ese negocio y que el negocio guarde la constancia.
  - Como el teléfono lo escribe el cliente, el panel le pide marcar «Tengo permiso de estas personas para enviarles recordatorios por WhatsApp». Sin esa casilla no se enciende. La fecha queda en `ajustes-historial.csv`.
  - Los reportes y bloqueos bajan la calidad del número y Meta puede limitarlo. Por eso hay tope por enlace (5) y por evento.
- **Límite de envío.** Una cartera sin verificar llega a 250 destinatarios únicos cada 24 h; verificada, a 2,000 o más. El límite se comparte entre todos los números y eventos de la cartera.
- **Precio desde el 1-oct-2026.** Meta cobra cada plantilla *utility*, aunque la ventana de 24 h esté abierta. Hay descuentos por volumen en *utility* (no en *marketing*).
- **Número de México.** Se envía como `52` + 10 dígitos; el `wa_id` que regresa Meta puede traer `521…`. `WhatsAppLink::phone()` ya normaliza los dos formatos.
- **Número sin WhatsApp.** El webhook regresa `failed` con el código 131026. El enlace queda como «Sin WhatsApp» y no se le vuelve a mandar.

### Ley (LFPDPPP 2025, vigente desde el 21-mar-2025)

- El aviso de privacidad de Jiro debe decir que trata teléfonos de invitados que entrega el cliente, para qué (recordatorios del RSVP) y que pasan por WhatsApp (Meta). La ley nueva pide separar finalidades necesarias y voluntarias.
- Usar un dato para algo distinto de lo que dice el aviso exige pedir permiso de nuevo: los teléfonos solo sirven para los recordatorios de ese evento.
- Los teléfonos se borran 30 días después de `fecha_evento` (paso 7).
- Conviene que un abogado revise el texto del aviso (pregunta 70).

### Costo de ejemplo (NAT)

- 80 enlaces, la mitad sin responder, un recordatorio cada 3 días durante 30 días: unos 400 mensajes.
- En *utility*: ≈3.4 USD (≈63 MXN). En *marketing*: ≈16 USD.
- Con el tope de 5 recordatorios por enlace: ≈200 mensajes como máximo.

## Trámites del usuario (bloquean el envío real, no el desarrollo)

1. **Meta Business** (business.facebook.com) a nombre de Jiro Invitaciones. Pedir también la **verificación del negocio** (constancia del RFC y un comprobante de domicilio que coincidan; de 1 a 5 días hábiles). No bloquea el estreno: sin verificar, el tope de 250 por día alcanza para NAT.
2. **App** en developers.facebook.com con el producto WhatsApp, y un **usuario del sistema** con token permanente (permisos `whatsapp_business_messaging` y `whatsapp_business_management`).
3. **Número:**
   - la *coexistencia* con el WhatsApp Business actual de Jiro (el mismo número sigue funcionando en la app), si Meta lo deja elegible;
   - si no, un chip nuevo que no tenga WhatsApp.
   El nombre visible («Jiro Invitaciones») lo aprueba Meta.
4. **Método de pago** en la cuenta de WhatsApp.
5. **Plantilla:** crearla y mandarla a revisión **el primer día** (de minutos a 48 h). Es lo que de verdad bloquea el estreno.
   Así se captura en el administrador de WhatsApp (WhatsApp Manager → Plantillas de mensajes → Crear):
   - **Nombre:** `recordatorio_rsvp` (va en el secreto `WHATSAPP_TEMPLATE`). **Categoría:** Utilidad. **Idioma:** Español (MEX).
   - **Cuerpo:** `Hola {{1}}, te recordamos confirmar tu asistencia a {{2}} antes del {{3}}. Toca el botón para responder.`
     Muestras para la revisión: `Familia Pérez`, `XV de Nat`, `6 de noviembre`. Sin nombre en el enlace, `{{1}}` se manda como «de nuevo» («Hola de nuevo, …»).
   - **Botón 1** (Visitar sitio web, URL dinámica): texto `Confirmar asistencia`, URL `https://invitaciones-jiro.fly.dev/i/{{1}}`, muestra `Ab3dE5gH7jK9`.
   - **Botón 2** (Respuesta rápida, personalizada): `Ya no recibir`. El código manda el `payload` `BAJA` en este botón.
   - El orden importa: el código manda el token en el botón 0 y la baja en el botón 1.
6. **Webhook** apuntando a `https://invitaciones-jiro.fly.dev/api/webhooks/whatsapp`, con el campo `messages`.
7. **Secretos** con `fly secrets set`: `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_APP_SECRET`, `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_TEMPLATE` y `RECORDATORIOS_CLAVE`.
8. **Cron externo** (cron-job.org o GitHub Actions) que llame a `POST /api/internal/reminders/run` con el encabezado `X-Reminders-Key` cada hora, de 10:00 a 19:00 hora del centro.

## Calendario para NAT

| Día | Usuario (Meta) | Código |
|---|---|---|
| Lun 26 – mar 27-oct | Meta Business, app, número y **plantilla a revisión** | Pasos 1 y 2 |
| Mié 28-oct | Prueba con el número de prueba de Meta | Pasos 3 y 4, pruebas |
| Jue 29-oct | Secretos, cron y `fly deploy` (cuando el usuario lo pida); NAT idéntica | — |
| Vie 30-oct | Encender en NAT desde el gestor; la clienta captura los teléfonos y marca el permiso | — |
| 31-oct, 2-nov, 4-nov (+6-nov) | Recordatorios «cada 2 días» a quien siga sin responder | — |

- **Plan B:** si la plantilla no está aprobada el jueves, el código queda listo y se enciende el día que Meta la apruebe. Cada día perdido es una ronda menos.
- Los enlaces de NAT se crearon hace semanas, así que el primer recordatorio sale en la primera corrida después de encenderla: conviene encenderla en la mañana, con los teléfonos ya capturados.

## Diseño

### Disparador: un endpoint, no el scheduler de Laravel

- En Fly la máquina se suspende sin visitas (`auto_stop_machines="suspend"`, `min_machines_running=0`), así que un cron interno no correría. Una *scheduled machine* de Fly no ve el volumen, que solo está montado en la máquina principal.
- `POST /api/internal/reminders/run` con `X-Reminders-Key` (`RECORDATORIOS_CLAVE`, comparada con `hash_equals`). La petición despierta la máquina. En GCP lo llamará Cloud Scheduler.
- Comando `php artisan recordatorios:enviar [--slug=] [--probar]` para local y pruebas (`--probar` solo dice a quién le toca).
- **Idempotente:** cada corrida manda solo lo que ya toca y no se mandó hoy; si el cron falla una hora, la siguiente lo recupera. Toda la corrida va bajo un candado global (`CsvFile::locked` sobre `eventos/_gestor/whatsapp/.run.lock`).

### Datos (CSV)

- `invitaciones.csv`: columna nueva `telefono`, al final. Se guarda normalizada con `WhatsAppLink::phone()`. Los archivos viejos se siguen leyendo (`CsvFile` lee por encabezado).
- `ajustes.csv`:
  - `whatsapp_recordatorios` (`SI` o vacío): lo cambia solo quien administra, en el gestor;
  - `whatsapp_tope`: máximo de mensajes del evento (300 por omisión);
  - `recordatorio_cada_dias` (0 = apagado; 2, 3, 5 o 7): lo elige el cliente;
  - `recordatorio_permiso`: fecha en que el cliente declaró tener el permiso.
- `eventos/<slug>/recordatorios.csv`: registro de solo agregar, con `fecha, invitacion, wamid, estado, detalle`. `estado` vale `enviado`, `entregado`, `leido`, `fallido` o `baja`. El estado de cada enlace es su última fila.
- `eventos/_gestor/whatsapp/mensajes.csv`: índice `wamid → slug, invitacion`, para que el webhook sepa a qué evento escribir.
- `eventos/_gestor/whatsapp/bajas.csv`: teléfonos que pidieron «Ya no recibir» (o escribieron «BAJA»). Es global: no reciben de ningún evento.

### Quién recibe hoy (`ReminderPlanner`)

Un enlace recibe si se cumple todo esto:
- el evento tiene `whatsapp_recordatorios=SI`, `recordatorio_cada_dias` > 0 y `recordatorio_permiso`;
- hoy no pasa de la fecha límite efectiva del RSVP (la de `ajustes.csv` o la del diseño) y faltan 2 días o más para el evento;
- el enlace está activo, tiene teléfono y ese teléfono no está en `bajas.csv`;
- no tiene ninguna respuesta (una parcial o un «No asistiré» cuentan como respuesta);
- su último estado no es «Sin WhatsApp»;
- pasaron `cada_dias` días o más desde su último envío (o desde que se creó, si nunca se le mandó);
- lleva menos de 5 recordatorios y el evento no llegó a `whatsapp_tope`.

Cada corrida respeta además `WHATSAPP_LIMITE_DIARIO` (200 por omisión, por el límite de Meta); lo que no alcanza sale en la siguiente.

### Envío y webhook

- Interfaz `ReminderChannel` con dos implementaciones:
  - `MetaWhatsAppChannel`: `POST https://graph.facebook.com/<versión>/{phone_number_id}/messages` con la plantilla y sus parámetros;
  - `LogChannel`: el de local y pruebas (como `MAIL_MAILER=log`).
  Se elige con `WHATSAPP_DRIVER`.
- Webhook (`/api/webhooks/whatsapp`):
  - `GET`: verificación con `hub.verify_token`;
  - `POST`: valida `X-Hub-Signature-256` (HMAC-SHA256 con el app secret). Los estados se agregan a `recordatorios.csv`; «Ya no recibir» o «BAJA» agregan el teléfono a `bajas.csv`. Siempre responde 200.
- El teléfono **nunca** sale en la config pública ni en `/i/`: solo en el panel.

### Panel y gestor

- Panel (solo con la función encendida):
  - teléfono al crear el enlace y editable en línea en la lista;
  - el estado del último envío por enlace (Enviado, Entregado, Leído, Sin WhatsApp, Se dio de baja, Respondió);
  - tarjeta «Recordatorios por WhatsApp» junto a la fecha límite: cada cuántos días, la casilla del permiso, el próximo envío y los mensajes usados contra el tope.
- La versión que consulta el panel cada 5 s incluye `recordatorios.csv`.
- Gestor → «Datos generales»: grupo «Recordatorios por WhatsApp» con el interruptor y el tope (solo quien administra) y, después del estreno, un resumen de mensajes enviados y su costo estimado.

## Verificación

- `php artisan test`, `pint`, `npm run test`, `npm run lint` y `npm run build`.
- En local con `WHATSAPP_DRIVER=log`: encender en un evento de prueba, poner teléfonos, `recordatorios:enviar --probar`, responder un enlace y ver que sale de la lista, y simular el webhook con firma válida.
- La config pública de NAT sale idéntica y el teléfono no aparece en ninguna respuesta pública.
- Envío real primero con el número de prueba de Meta (hasta 5 destinatarios, sin costo).

## Fuentes

- Precios de Meta y cambios del 1-oct-2026: [Meta pricing](https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing) · [itechdev México 2026](https://itechdev.com.mx/en/blog/precio-whatsapp-business-api-mexico-2026) · [engagelab](https://www.engagelab.com/blog/whatsapp-business-api-pricing) · [Twilio, aviso oct-2026](https://support.twilio.com/hc/en-us/articles/53100462475931-Notice-Changes-to-WhatsApp-s-Pricing-October-2026)
- Categorías de plantilla: [Meta template categorization](https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/template-categorization) · [ycloud](https://www.ycloud.com/blog/whatsapp-api-message-template-guide)
- Límites de envío: [Meta messaging limits](https://developers.facebook.com/documentation/business-messaging/whatsapp/messaging-limits)
- Coexistencia: [360dialog](https://docs.360dialog.com/docs/hub/embedded-signup/whatsapp-coexistence)
- Permiso (opt-in): [tyntec](https://www.tyntec.com/blogs/whatsapp-business-opt-in/) · [360dialog](https://docs.360dialog.com/partner/messaging/sending-and-receiving-messages/before-sending-a-message)
- Botones de plantilla: [360dialog template elements](https://docs.360dialog.com/partner/messaging/template-messages/template-elements)
- Verificación del negocio en México: [leadsales](https://leadsales.io/blog/verificar-negocio-meta-business-para-usar-api/)
- SMS en México: [Twilio MX](https://twilio.com/en-us/sms/pricing/mx) · [SMS Masivos API](https://info.smsmasivos.com.mx/sms-api-developers) · [sent.dm](https://www.sent.dm/resources/mexico-sms-pricing)
- LFPDPPP 2025: [EY](https://www.ey.com/es_mx/technical/tax/boletines-fiscales/nueva-ley-federal-proteccion-datos-personal-posesion-particulares) · [Basham](https://basham.com.mx/nueva-ley-federal-de-proteccion-de-datos-personales-en-posesion-de-los-particulares-publicada-en-el-diario-oficial-de-la-federacion/)
