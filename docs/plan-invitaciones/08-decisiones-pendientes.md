# Decisiones pendientes

Marca tu elección. Lo que esté en **negritas** es la recomendación y lo que el plan asume por defecto. La columna **Estado** dice qué se decidió hasta el 14-oct-2026.

| # | Decisión | Opciones | Impacto | Estado |
|---|---|---|---|---|
| D1 | Visibilidad del repo | **Privado** · Público con datos de ejemplo | Privacidad (fotos y nombres reales) | Pendiente (acción tuya). Sigue público y el motor ya se subió a `main` (13-oct). No hay datos de la familia en git; las fotos y la canción de la boda original ya no se versionan, pero siguen en el historial (pregunta 16) |
| D2 | Nombres de carpetas | **Mantener `api-invitation/` y `boda-invitacion/`** · Renombrar a `api/` y `web/` | Si se renombra, actualizar las rutas del plan y del CI | **Decidido:** `api/`, `web/` y `recepcion/` en un solo monorepo |
| D3 | Hosting | **API en VPS + web en Netlify/Vercel** · Todo en el VPS (Laravel sirve la SPA) · Railway/Render | Costo, CORS y Open Graph | **Decidido:** Fly.io, un contenedor con API e invitación y un disco para `eventos/` (~2–3 USD/mes). Ver `06-despliegue/despliegue.md` |
| D4 | Dominio | `invitaciones.<tu-dominio>` + `api.<tu-dominio>` · Otro | ~~Cookies de Sanctum~~ Ya no aplica: el panel usa token, no cookies | En uso: `invitaciones-jiro.fly.dev` (un solo dominio para todo). Un dominio propio es opcional (`fly certs add`) |
| D5 | ¿Quién administra los eventos? | **Solo tú** · También clientes (multiusuario con políticas) | Si hay clientes: registro, roles y límites | **Decidido:** un panel por evento, con la clave del Excel (`clave_panel`); solo entra quien tenga la clave |
| D6 | Origen de los assets de NAT | **Exportarlos desde tu editor de Canva** (si el diseño es tuyo y la licencia lo permite) · Comprar o crear ilustraciones propias | Fidelidad y licencia | En uso: 26 ilustraciones del Canva en `eventos/nat/media/` (privado). Falta confirmar la licencia y conseguir la foto original |
| D7 | Música del evento real | Archivo del cliente · **Playlist de Spotify** · Ambos | Peso y derechos | **Decidido (13-oct):** MP3 (`cancion.mp3`, canción completa). El enlace de Spotify sigue en la sección `playlist` para guardarla |
| D8 | Modo de RSVP del evento real | **Token por familia (pases)** · Abierto · WhatsApp | Control de cupo | **Decidido:** enlaces generados en el panel por número de invitados, con un campo por persona; los nombres quedan fijos |
| D9 | Pases PDF con QR y check-in en la puerta | Sí, en esta versión · **Después del evento real** | Tiempo de la fase 5 | Sin hacer (después). La mesa ya se guarda en `respuestas.csv` para el buscador. **Decidido (13-oct):** el lector de la recepción lee **el mismo QR** de la invitación que se manda por WhatsApp (el del PDF, con el enlace `/i/{token}`); no habrá un QR aparte |
| D10 | Marca propia en el pie (en lugar de "Diseñado con Canva") | Nombre de tu marca (¿"invitecs"?) · Ninguna | Branding | Pendiente (pregunta 6) |
| D11 | Fecha y hora real del evento | 28-nov-2026, 17:00 (inferida) · Otra | El countdown del sitio original apunta a ≈18-dic: **confirmar** | Pendiente (pregunta 1). Se usa 28-nov-2026 17:00 |
| D12 | Acceso al gestor (`/gestor`) | Una clave maestra (`GESTOR_CLAVE`) · **Una cuenta por persona** | Quién puede crear y publicar invitaciones, y saber quién publicó qué | ~~Clave maestra para todos~~ **Cambió (14-oct, pregunta 39):** cada persona entra con su usuario y su clave (`eventos/_gestor/usuarios.csv`, solo el hash); rol *Administra* (además agrega personas y les da o quita el acceso) o *Edita*. Quien llega recibe una clave temporal y elige la suya al entrar. El historial y las bitácoras dicen quién publicó o cambió cada cosa. `GESTOR_CLAVE` (16+ caracteres) enciende el gestor y crea la primera cuenta; si cambia, se cierran todas las sesiones. Sesión de 12 h, 5 intentos por minuto. Es aparte de la clave de cada panel |
| D13 | Formato de la invitación | **Un solo archivo `invitacion.csv` (+ `ajustes.csv`)** · Varias hojas como antes | Simplicidad; desarmar y armar | **Decidido (14-oct):** `seccion, elemento, campo, valor`; se descarga e importa como csv, Excel o zip. `layout.xlsx` queda deprecado (se lee igual hasta la limpieza, después del 28-nov) |
| D14 | Cuándo ven los invitados los cambios | **Borrador + Publicar** · Al instante | Seguridad al editar una invitación ya enviada | **Decidido (14-oct):** autoguardado en `borrador/`; los invitados ven los cambios al publicar. La clave y "visible" sí aplican al instante |
| D15 | Plantillas | **Biblioteca de plantillas + eventos, mismo formato** · Solo copiar eventos | Reusar diseños | **Decidido (14-oct):** una plantilla es un evento con `plantilla=SI`: nunca pública y sin panel |
| D16 | Estilo de los textos | **Letra, color y tamaño por bloque de texto y por sección** · Solo para toda la invitación | Combinaciones de letras | **Decidido (14-oct):** `<bloque>_fuente`, `_color` (hex o nombre de la paleta) y `_tamano` (50–250 %); `textos` vale para toda la invitación y la sección gana |

Cuando decidas, actualiza esta tabla (o díselo a Claude Code en VS Code) para que el plan y el `CLAUDE.md` queden alineados.

## Preguntas abiertas (13-oct-2026)

Salieron durante la implementación y se juntaron para el final. Al responder una, se quita de aquí.

**Contenido del evento**

1. **Hora de inicio:** se usó 28-nov-2026 a las 17:00, deducida de "Recepción 5:00 pm". El contador del Canva apuntaba a otra fecha. ¿Es correcta?
2. **Foto de la festejada:** la actual es la versión comprimida del sitio de Canva. ¿Hay una original en mejor calidad?
3. **Música de NAT:** **Decidido (13-oct, noche): MP3.** Pasaste el MP3 de "Risk It All" y ya suena completo al abrir el sobre (ver `09-avance.md`). Lo de abajo queda como historia. *13-oct:* se puso la canción de Spotify que mandaste (`track/5y2ijHECwFYWqcAHKTZgzD`). Sin sesión de Spotify se oyen 30 s y se detiene. ¿Basta así, o consigues el MP3 para que suene completa? Antes: ¿MP3 propio o playlist de Spotify? Las dos ya funcionan (`musica_fuente`). Con Spotify, al abrir el sobre suena la playlist, pero:
   - Quien no tiene sesión de Spotify en ese navegador oye **muestras de 30 s** por canción y ve el aviso "Obtener Spotify" de Spotify.
   - En iPhone, Safari puede pedir tocar ▶ en el reproductor.

   Con MP3 suena la canción completa en todos lados. Para usarla, hace falta el MP3 (≤ 3 MB) o el enlace de la playlist.

   **¿Completa desde Spotify? (revisado el 13-oct):** solo para quien tiene sesión de Spotify en el mismo navegador donde abre el enlace. No depende de la invitación: el reproductor ya trae el permiso `encrypted-media` que pide Spotify (revisado en su script).
   - Desde WhatsApp el enlace abre en el navegador de WhatsApp, que casi nunca tiene esa sesión. En celular, casi todos oirán 30 s.
   - El reproductor completo de Spotify (Web Playback SDK) pide que cada invitado entre con su cuenta Premium. No sirve para una invitación.
   - YouTube suena completo sin cuenta, pero obliga a dejar el video a la vista y puede poner anuncios.
   - **Recomendación: MP3.**
     - Ya funciona: `musica_fuente` = `archivo` y `musica_audio` = el nombre del archivo en `media/`.
     - Se guarda en el disco de Fly (lo sube `deploy/subir-evento.sh`) y nunca entra a git.
     - La canción de Spotify puede seguir como sección `playlist`, para guardarla en Spotify. Al tocarla se pausa el MP3.
     - Ojo: es una canción comercial en una página pública, aunque no aparece en buscadores. Los derechos los decides tú.

   **Lista de canciones sin el aviso de Spotify:** el reproductor de Spotify muestra su aviso "Obtener Spotify" a quien no tiene sesión, después de cada muestra. La alternativa es una **app de desarrollador de Spotify** (gratis, con cualquier cuenta, en developer.spotify.com): con su Client ID y Client Secret, la API lee tu playlist (portada, canciones, artistas, duración) y la invitación la dibuja con su propio estilo, siempre visible y sin aviso. Cada canción abre en Spotify. No incluye el audio: para el sobre, MP3. ¿Lo hacemos así?
4. **Ortografía:** se corrigió la del Canva ("por sí solos", "capítulo"). ¿Se queda así?
5. **Hora de término** para "Agregar a mi calendario": se supusieron 6 h (17:00–23:00).
6. **Cierre:** hoy solo dice "¡Te esperamos!". ¿Agregamos créditos de marca propia ("Hecho por…"), un hashtag o un texto final? (D10)
7. **Sobre cerrado:** la página no deja bajar hasta abrir el sobre, como pedía el plan. ¿Se queda así o se permite bajar sin abrirlo?

**Envío y confirmación**

8. **Texto de `mensaje_whatsapp`** con el que se manda cada enlace. Si no se pone, se usa uno genérico.
9. **WhatsApp de la invitación general:** ¿qué número (`rsvp_whatsapp`) lleva el botón de `/e/nat`?
10. **"Asistiré / No asistiré":** hoy aplica a todos los nombres de un mismo envío, como en la imagen. ¿O prefieres elegirlo por persona?
11. **Nombre de la invitación:** el nombre opcional ("Familia Pérez") se muestra en el sobre. ¿Está bien, o debe ser solo una nota interna?
12. **Enlaces generados:** hoy no se pueden borrar ni cambiar sus invitados. ¿Hace falta?
13. **Canción para la festejada:** el mensaje ya está, como dedicatoria (una por enlace). ¿Quieres también pedir una canción?
14. **Mesas:** hoy son números del 1 al 999, igual que en el buscador. ¿Necesitas mesas con nombre ("Honor", "Principal")? ¿Y un cupo por mesa que avise cuando se llene?

**Publicación y repo**

15. **Dominio de producción:** ya publicado en `https://invitaciones-jiro.fly.dev` y los enlaces del panel salen con esa dirección. ¿Lo dejamos así o pones un dominio propio? (D4)
16. **Archivos de la boda original en `web/public/`:** *Hecho (13-oct):* se dejaron de versionar (`git rm --cached` + `.gitignore`); las copias locales siguen para la referencia en desarrollo. Ojo: siguen en el historial de git. Para borrarlos de ahí habría que reescribir el historial (`git filter-repo`) y forzar el push. ¿Lo hacemos?
17. **Acción tuya:** agregar `clave_panel` (mínimo 8 caracteres) en la pestaña `evento` del Excel real de NAT.

**Clima y playlist**

18. **Licencia del clima:** Open-Meteo es gratis para uso no comercial. Si las invitaciones se van a vender, hay que contratar su plan comercial (basta poner `OPEN_METEO_API_KEY`) o cambiar de proveedor. ¿Es para uso comercial?
19. **NAT real:** *Hecho:* el Excel real ya trae `sin_ninos` (9.2), `clima` (9.5), `playlist` (9.6), `dedicatoria` (11.5) y `cambio_de_color` en el Dress Code (revisado el 13-oct).

**Dedicatorias, sin niños y diseño**

20. **Dedicatorias:** hoy se aceptan siempre, también después de la fecha límite y del evento. ¿Se cierran en alguna fecha? ¿Las quieres exportar para imprimir o leerlas en la fiesta?
21. **Textos:** los de "Sin niños" ("Queremos mucho a sus pequeños, pero esta celebración es solo para adultos…") y de la dedicatoria ("Déjame un mensaje bonito: lo guardaré para siempre como recuerdo de mis XV años.") son propuestas mías. ¿Se quedan o tienes los definitivos?
22. **Paneles:** las secciones quedaron como tarjetas con 16 px entre ellas y a las orillas. ¿Así, o de orilla a orilla (bandas)? Es un cambio de tokens (`--section-gap`, `--panel-radius`).
23. **Primera visita lenta:** *Atendido en el código:* la máquina ahora se suspende en lugar de apagarse (despierta en unos cientos de ms). **Comprobado (13-oct):** `fly status` la muestra `suspended`, así que Fly sí la suspende. **Decidido (13-oct):** se siente muy fluido; se queda como está, sin máquina siempre encendida.
24. **Token de GitHub:** *Hecho (13-oct):* el remoto ya no lleva el token (`git remote -v` → `https://github.com/rjm019/invitaciones.git`). **Acción tuya:** revocar ese token en GitHub → Settings → Developer settings → Personal access tokens. El push ya va con `gh` (sesión de `rjm019` en el llavero de macOS). Así subiste los 5 commits del 13-oct (`d2915da..87f4626`).
25. **"La palabra ubicación…":** *Hecho (13-oct):* que se escriba letra por letra. El tema ya lo traía, pero la fila `ubicacion` del Excel decía solo `aparecer brillo` y eso reemplaza los efectos del tema; se agregó `escribir` y el título tarda 1 s.

**Nat, hospedaje y envío (13-oct, noche)**

26. **Clave del panel:** *Hecho (13-oct):* la cambiaste tú en el Excel. Hay que subirla a producción con `deploy/subir-evento.sh nat`.
27. **¿Nat o Nath?** En un mensaje escribiste "nath" y en los demás "Nat". Hoy todo dice **Nat** (sobre, foto, panel, imagen para WhatsApp), y así viene en tu diseño de referencia (NAT.pdf). Se queda Nat salvo que digas otra cosa.
28. **Mensaje que acompaña al PDF:** *Decidido (13-oct):* sin enlace. El QR lleva el enlace, y **es el mismo que leerá el lector en la recepción** (ver D9). Comprobado: el QR de la imagen y el del PDF dan exactamente el enlace `/i/{token}` de esa invitación, aun con el PDF a baja resolución.
29. **PDF de referencia:** *Hecho (13-oct):* llegó NAT.pdf (Canva). La imagen para WhatsApp ahora sigue ese diseño: su fondo de mármol azul con el sobre y el lacre (`tarjeta-fondo.webp`, sacado del PDF), "MIS XV AÑOS" y "NAT" en dorado entre estrellas, en el sobre para quién es y cuántos pases, y abajo "Celebremos juntos / esta etapa tan especial", la fecha y el QR.
30. **Hospedaje:** *Decidido (13-oct):* solo como mención, sin tarifas: el título es "Recomendación de hospedaje", sin subtítulo y sin el texto "Si vienes de fuera…" (lo quitaste); se quedan las notas de distancia. Fotos: Camino Real y Gamma, de las fotos de fachada de sus sitios oficiales (caminoreal.com.mx y gammahoteles.com); la del Luxury la mandaste tú. Todas en `media/` (privado). Si prefieres no usar fotos de los hoteles, se borra la columna `foto`.
31. **Nombre anterior en el historial de git:** el repo público ya no lo tiene en ningún archivo, pero sigue en commits viejos (rutas `02-diseno-…` y textos). Borrarlo de ahí es lo mismo que la pregunta 16: reescribir el historial y forzar el push. ¿Lo hacemos junto?
32. **Dependencias con avisos de seguridad:** *Hecho (13-oct):* `npm audit fix` y `npm update`, sin cambiar de versión mayor (vue 3.5.44, axios 1.20, lodash 4.18, vue-router 4.6, vite 6.4). De 24 avisos quedan 9, y **0 en lo que llega al navegador** (`npm audit --omit=dev`). `@tsconfig/node22` se quedó en 22.0.0 porque la 22.0.6 pide un TypeScript más nuevo. La API (`composer audit`) no tiene avisos. Lo que queda, en la pregunta 34.

**Hospedaje y dependencias (13-oct, noche)**

33. **Foto del Luxury Hotel Boutique:** *Hecho (13-oct):* la mandaste por WhatsApp; va como `hotel-luxury.webp` (920 px).
34. **Los 9 avisos que quedan** son de las herramientas de pruebas y de revisión de código (vitest, eslint-plugin-vue, @vue/eslint-config-typescript), que no se publican. Solo se quitan subiendo de versión mayor (vitest 3 → 5, eslint-plugin-vue 9 → 10). ¿Lo hago? Puede pedir ajustes en pruebas o en la configuración.

**Gestor de plantillas (14-oct)**

35. **Revisar y unir la rama:** el gestor y el formato nuevo están en `feature/gestor-plantillas` (sin push). Para probarlo en local, la clave maestra ya está en `api/.env` (`GESTOR_CLAVE`, generada al azar; cámbiala si quieres) y se entra en `http://localhost:5173/gestor`. ¿Lo uno a `main` y hago push cuando lo revises? *Respuesta (14-oct): todavía no; primero lo revisas en local.* La primera vez, `/gestor` te pide crear tu cuenta con esa clave maestra (después cada quien entra con la suya).
36. **Producción, cuándo:** el runbook (`06-despliegue/despliegue.md` → "Gestor: primera publicación") empieza con `fly secrets set GESTOR_CLAVE=…`, que reinicia la máquina unos segundos, y termina migrando NAT en el servidor. ¿Lo corremos antes de mandar los enlaces o después del 6-nov? La clave de producción la eliges tú; no se escribe en ningún archivo. *Respuesta (14-oct): todavía no (va con la 35).* Ahora el runbook también incluye crear tu cuenta en `/gestor` justo después del deploy.
37. **Primera plantilla:** la base "En blanco" sale sin adornos, porque el tema no trae imágenes propias (D6). Lo práctico es hacer una plantilla "Jardín azul" desde NAT, pero se llevaría las ilustraciones del Canva y, si no las quitas, la foto de Nat y las de los hoteles. ¿La armamos sin las fotos personales? ¿Las ilustraciones se pueden usar para otros clientes (licencia, D6)? *Respuesta (14-oct): no por ahora; "solo me importa tener funcionando la de NAT".* No se arma ninguna plantilla.
38. **"Ver como invitado" y "reducir movimiento":** si en tu computadora está activado "reducir movimiento", la invitación nunca muestra el sobre cerrado (igual que a un invitado con esa opción), así que ese botón no cambia nada. ¿Está bien, o quieres que en el gestor siempre se vea cerrado? *Explicado (14-oct):* "reducir movimiento" es una opción de accesibilidad del sistema (Mac: Ajustes → Accesibilidad → Pantalla); tu Mac la tiene apagada, por eso en local ves el sobre cerrado igual que en producción. Solo afecta a quien edite con esa opción encendida: en su vista previa nunca vería el sobre cerrado. Ahora que habrá varias personas, **falta decidir** si en el gestor se muestra siempre cerrado (y se abre sin animación).
39. **Una o varias personas en el gestor:** hoy hay una sola clave maestra para todos (D12). Si va a entrar más gente a armar invitaciones, conviene una cuenta por persona (y saber quién publicó qué). ¿Hace falta? *Hecho (14-oct): una cuenta por persona (D12).*
40. **Quién ve qué en el gestor:** hoy cada persona ve y edita todas las invitaciones (y quien administra, además, las cuentas). ¿Está bien así, o cada quien debería ver solo las suyas (las que creó o las que le asignes)?
