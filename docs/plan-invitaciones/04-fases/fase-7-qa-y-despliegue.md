# Fase 7 — QA, CI y despliegue

**Objetivo:** publicar con confianza y dejar el proceso repetible.
**Duración estimada:** 1–1.5 días.
**Referencias:** `../05-calidad/`, `../06-despliegue/despliegue.md`.

> **Estado (13-oct-2026): sin empezar; la publicación espera por decisión tuya.** Cambió lo que hay que desplegar: **no hay base de datos**. La API necesita un disco persistente para `eventos/`, y el respaldo es de esa carpeta. `06-despliegue/despliegue.md` todavía describe MySQL y Sanctum, así que hay que ajustarlo antes de publicar. Hay que publicar antes de mandar los enlaces, que hoy apuntan a localhost. El RSVP cierra el 6-nov-2026.
> Casillas: `[x]` hecho · `[x] ~~…~~ Cambió:` resuelto de otra forma · `[ ]` pendiente.

## Tareas

- [ ] Recorrer `../05-calidad/checklist-qa.md` completo con el evento demo y luego con el evento real.
- [ ] **CI** (`.github/workflows/ci.yml`):
  - **Job `api`:** PHP 8.3, `composer install`, `php artisan test` y `pint --test`. *Ya sin MySQL de servicio.*
  - **Job `web`:** Node 22, `npm ci`, `lint`, `test` y `build` (en Linux; detecta errores de mayúsculas en imports como el bug #5).
- [ ] **Vista previa de WhatsApp (Open Graph):** WhatsApp no ejecuta JS, así que la SPA no basta. Hay dos opciones:
  - **Opción A:** ruta web de Laravel `GET /i/{token}` que devuelve un HTML mínimo con `og:title`, `og:image` y `og:description` del evento, y redirige (meta refresh o JS) a la SPA.
  - **Opción B:** función edge en Netlify o Vercel que inyecta las OG tags.
  - **Recomendada:** A, porque usa tu stack.
- [x] Ajustar `../06-despliegue/despliegue.md` al modelo sin base de datos y desplegar. *Fly.io (13-oct): https://invitaciones-jiro.fly.dev, un contenedor con API e invitación y un disco para `eventos/`.*
- [ ] **Smoke test en producción:**
  - Abrir el link por token desde WhatsApp en Android y en iPhone.
  - Confirmar.
  - Ver la respuesta en el panel.
  - Descargar el PDF.
- [ ] **Respaldo:** *Fly hace un snapshot diario del volumen; falta bajar los CSV antes y después del evento (`fly ssh sftp get`).* ~~Cron diario de la carpeta `eventos/`, con sus CSV, `layout.xlsx` y `media/`. ~~`mysqldump` + copia de `storage/app/public/eventos`.~~ *La API ya guarda una copia del día en `eventos/<slug>/respaldos/` antes de cada cambio, pero en el mismo disco.*
- [x] Documentar en `README.md` de la raíz cómo correr el proyecto y en `eventos/README.md` cómo crear un evento. Cómo desplegar está en `../06-despliegue/despliegue.md`.

## Después del evento

- [ ] Exportar respuestas. *Ya son CSV; basta con copiarlos.*
- [ ] Despublicar o archivar el evento (respuesta `410`) a los 30 días. *Hoy `publicado = NO` responde 404.*
- [ ] Borrar las fotos de menores del storage cuando el cliente lo autorice.
