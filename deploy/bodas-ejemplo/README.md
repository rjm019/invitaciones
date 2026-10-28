# Bodas de ejemplo

Invitaciones **regulares** (no muestras): sin `demo`, con panel y clave; la confirmación, las dedicatorias, la trivia y el álbum sí se guardan. Datos ficticios; fotos libres (CC0, `CREDITOS.md`).

| Evento | Tema | Qué es |
|---|---|---|
| `boda-isabella-mateo` | `lacre` | Isabella & Mateo, 23-oct-2027, San Miguel de Allende: papelería fina con todas las secciones del tema, trivia y álbum |
| `boda-isabella-mateo-encaje` | `encaje` | La versión en encaje (salvia y marfil, todas las secciones, trivia y álbum); antes era la muestra `demo-boda-encaje` |

- Armar en local: `python3 deploy/bodas-ejemplo/armar.py` (arma los dos; escribe en `eventos/`, fuera de git) y luego `docker compose exec -T api php artisan invitacion:validar <slug>`.
- La primera vez genera al azar la clave del panel y dos invitaciones (tokens de 12 caracteres) y los imprime; no se versionan. Si el evento ya existe, conserva los suyos y solo reescribe el diseño y las fotos.
- **Claves y tokens se respetan:** si `eventos/<slug>` ya tiene `clave_panel` en `ajustes.csv` o `invitaciones.csv`, el generador no los cambia (así no se rompen los enlaces ya entregados); solo reescribe `invitacion.csv`, `publicado=SI` y las fotos. Nunca crea `demo`.
- `media/` (lacre) y `media-encaje/` llevan solo las fotos que usa cada una (con sus miniaturas `-480`); créditos en `CREDITOS.md` y `CREDITOS-encaje.md`.
