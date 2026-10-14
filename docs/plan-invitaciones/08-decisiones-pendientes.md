# Decisiones pendientes

Marca tu elección. Lo que esté en **negritas** es la recomendación y lo que el plan asume por defecto. La columna **Estado** dice qué se decidió hasta el 13-oct-2026.

| # | Decisión | Opciones | Impacto | Estado |
|---|---|---|---|---|
| D1 | Visibilidad del repo | **Privado** · Público con datos de ejemplo | Privacidad (fotos y nombres reales) | Pendiente (acción tuya). Sigue público y el motor ya se subió a `main` (13-oct). No hay datos de la familia en git; las fotos y la canción de la boda original ya no se versionan, pero siguen en el historial (pregunta 16) |
| D2 | Nombres de carpetas | **Mantener `api-invitation/` y `boda-invitacion/`** · Renombrar a `api/` y `web/` | Si se renombra, actualizar las rutas del plan y del CI | **Decidido:** `api/`, `web/` y `recepcion/` en un solo monorepo |
| D3 | Hosting | **API en VPS + web en Netlify/Vercel** · Todo en el VPS (Laravel sirve la SPA) · Railway/Render | Costo, CORS y Open Graph | **Decidido:** Fly.io, un contenedor con API e invitación y un disco para `eventos/` (~2–3 USD/mes). Ver `06-despliegue/despliegue.md` |
| D4 | Dominio | `invitaciones.<tu-dominio>` + `api.<tu-dominio>` · Otro | ~~Cookies de Sanctum~~ Ya no aplica: el panel usa token, no cookies | En uso: `invitaciones-jiro.fly.dev` (un solo dominio para todo). Un dominio propio es opcional (`fly certs add`) |
| D5 | ¿Quién administra los eventos? | **Solo tú** · También clientes (multiusuario con políticas) | Si hay clientes: registro, roles y límites | **Decidido:** un panel por evento, con la clave del Excel (`clave_panel`); solo entra quien tenga la clave |
| D6 | Origen de los assets de NAT | **Exportarlos desde tu editor de Canva** (si el diseño es tuyo y la licencia lo permite) · Comprar o crear ilustraciones propias | Fidelidad y licencia | En uso: 26 ilustraciones del Canva en `eventos/nat/media/` (privado). Falta confirmar la licencia y conseguir la foto original |
| D7 | Música del evento real | Archivo del cliente · **Playlist de Spotify** · Ambos | Peso y derechos | Pendiente (pregunta 3): las dos fuentes funcionan (`musica_fuente`); con Spotify la playlist suena al abrir el sobre |
| D8 | Modo de RSVP del evento real | **Token por familia (pases)** · Abierto · WhatsApp | Control de cupo | **Decidido:** enlaces generados en el panel por número de invitados, con un campo por persona; los nombres quedan fijos |
| D9 | Pases PDF con QR y check-in en la puerta | Sí, en esta versión · **Después del evento real** | Tiempo de la fase 5 | Sin hacer (después). La mesa ya se guarda en `respuestas.csv` para el buscador |
| D10 | Marca propia en el pie (en lugar de "Diseñado con Canva") | Nombre de tu marca (¿"invitecs"?) · Ninguna | Branding | Pendiente (pregunta 6) |
| D11 | Fecha y hora real del evento | 28-nov-2026, 17:00 (inferida) · Otra | El countdown del sitio original apunta a ≈18-dic: **confirmar** | Pendiente (pregunta 1). Se usa 28-nov-2026 17:00 |

Cuando decidas, actualiza esta tabla (o díselo a Claude Code en VS Code) para que el plan y el `CLAUDE.md` queden alineados.

## Preguntas abiertas (13-oct-2026)

Salieron durante la implementación y se juntaron para el final. Al responder una, se quita de aquí.

**Contenido del evento**

1. **Hora de inicio:** se usó 28-nov-2026 a las 17:00, deducida de "Recepción 5:00 pm". El contador del Canva apuntaba a otra fecha. ¿Es correcta?
2. **Foto de la festejada:** la actual es la versión comprimida del sitio de Canva. ¿Hay una original en mejor calidad?
3. **Música de NAT:** *13-oct:* se puso la canción de Spotify que mandaste (`track/5y2ijHECwFYWqcAHKTZgzD`). Sin sesión de Spotify se oyen 30 s y se detiene. ¿Basta así, o consigues el MP3 para que suene completa? Antes: ¿MP3 propio o playlist de Spotify? Las dos ya funcionan (`musica_fuente`). Con Spotify, al abrir el sobre suena la playlist, pero:
   - Quien no tiene sesión de Spotify en ese navegador oye **muestras de 30 s** por canción y ve el aviso "Obtener Spotify" de Spotify.
   - En iPhone, Safari puede pedir tocar ▶ en el reproductor.

   Con MP3 suena la canción completa en todos lados. Para usarla, hace falta el MP3 (≤ 3 MB) o el enlace de la playlist.

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
19. **NAT real:** `clima`, `playlist`, `sin_ninos`, `dedicatoria` y el efecto `cambio_de_color` del Dress Code solo están en la copia de prueba (`nat-prueba`). ¿Los agrego al Excel real? ¿En el mismo orden?

**Dedicatorias, sin niños y diseño**

20. **Dedicatorias:** hoy se aceptan siempre, también después de la fecha límite y del evento. ¿Se cierran en alguna fecha? ¿Las quieres exportar para imprimir o leerlas en la fiesta?
21. **Textos:** los de "Sin niños" ("Queremos mucho a sus pequeños, pero esta celebración es solo para adultos…") y de la dedicatoria ("Déjame un mensaje bonito: lo guardaré para siempre como recuerdo de mis XV años.") son propuestas mías. ¿Se quedan o tienes los definitivos?
22. **Paneles:** las secciones quedaron como tarjetas con 16 px entre ellas y a las orillas. ¿Así, o de orilla a orilla (bandas)? Es un cambio de tokens (`--section-gap`, `--panel-radius`).
23. **Primera visita lenta:** *Atendido en el código:* la máquina ahora se suspende en lugar de apagarse (despierta en unos cientos de ms). Falta publicar y comprobar que Fly sí la suspende. Si no, ¿dejamos una encendida (~3 USD/mes)?
24. **Token de GitHub:** *Hecho (13-oct):* el remoto ya no lleva el token (`git remote -v` → `https://github.com/rjm019/invitaciones.git`). **Acción tuya:** revocar ese token en GitHub → Settings → Developer settings → Personal access tokens. Para el push, usa el llavero de macOS con un token nuevo o instala `gh` (`brew install gh` y `gh auth login`).
