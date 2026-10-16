# Plantillas del repositorio

Plantillas de diseño listas para el gestor (`plantilla=SI`): solo el diseño, sin datos de personas. Las secciones se agregan en el gestor; cada una toma sola el diseño del tema (fondos, adornos y efectos).

| Plantilla | Tema | Qué trae |
|---|---|---|
| `nueva-york` | `nueva-york` | Noche en Manhattan: negro, blanco perla y plata. Portada con sobre perla, tarjeta negra con marco art déco y la corona del Chrysler, reflectores, horizonte de Manhattan que avanza y escarcha. Paleta "Nueva York" y letras Great Vibes, Bodoni Moda y Jost. |

- **En local:** `deploy/plantillas/instalar.sh nueva-york` crea `eventos/plantilla-nueva-york/` (oculta, como plantilla). Si ya existe no la toca.
- **En producción (Fly):** en el gestor, *Nueva* → en blanco, como plantilla; luego *Importar* este `invitacion.csv` (queda en el borrador). No hace falta subir nada por consola.
- Para cambiarla: edítala en el gestor, descárgala (csv) y reemplaza aquí su `invitacion.csv`.
