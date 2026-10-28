# Bodas de ejemplo

Invitaciones **regulares** (no muestras): sin `demo`, con panel y clave; la confirmación, las dedicatorias, la trivia y el álbum sí se guardan. Datos ficticios; fotos libres (CC0, `CREDITOS.md`).

| Evento | Tema | Qué es |
|---|---|---|
| `boda-isabella-mateo` | `lacre` | Isabella & Mateo, 23-oct-2027, San Miguel de Allende: papelería fina con todas las secciones del tema, trivia y álbum |

- Armar en local: `python3 deploy/bodas-ejemplo/armar.py` (escribe en `eventos/`, fuera de git) y luego `docker compose exec -T api php artisan invitacion:validar boda-isabella-mateo`.
- La primera vez genera al azar la clave del panel y dos invitaciones (tokens de 12 caracteres) y los imprime; no se versionan. Si el evento ya existe, conserva los suyos y solo reescribe el diseño y las fotos.
- `media/` lleva solo las fotos que usa (con sus miniaturas `-480`).
