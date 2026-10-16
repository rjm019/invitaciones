# Plantillas del repositorio

Plantillas de diseño listas para el gestor (`plantilla=SI`): **todas las secciones**, con su diseño y textos de ejemplo ("Nombre", "Nombre Apellido", "Nombre del salón", cuentas en ceros), sin datos de personas ni fotos. Al usarla, se cambia lo de ejemplo y se quita lo que no haga falta.

| Plantilla | Tema | Qué trae |
|---|---|---|
| `nueva-york` | `nueva-york` | Noche en Manhattan: negro, blanco perla y plata, con secciones difuminadas (franjas de papel con hoja rasgada y franjas grises cortadas por la ciudad) y confeti plateado. Las 18 secciones, cada una con su diseño: portada con el elevador art déco y bolas disco, tocadiscos, programa de Broadway (papás y padrinos), boleto con la semana del evento, ventana de rascacielos (sin foto: se sube la de la invitación), letrero del metro, neón, itinerario en la línea del metro (con la Estatua y el puente de Brooklyn), vitrinas de la Quinta Avenida, cordón de terciopelo, tablero de Grand Central, clima, colgantes de hotel, bolsas de la mesa de regalos y lluvia de sobres, playlist (sale al poner el enlace de Spotify), pase VIP, postal de correo aéreo y marquesina. Paleta "Nueva York" y letras Great Vibes, Bodoni Moda y Jost. |

- **En local:** `deploy/plantillas/instalar.sh nueva-york` crea `eventos/plantilla-nueva-york/` (oculta, como plantilla). Si ya existe no la toca.
- **En producción (Fly):** `deploy/plantillas/subir.sh nueva-york` crea `/data/eventos/plantilla-nueva-york/` igual que en local. Si allá ya existe no la toca (puede tener cambios hechos en el gestor); con `--forzar` reemplaza su `invitacion.csv` (guarda antes la del servidor en `respaldos/`) y deja sus ajustes.
  - Sin consola: en el gestor, *Nueva* → en blanco, como plantilla; luego *Importar* este `invitacion.csv` (queda en el borrador) y *Guardar plantilla*.
- Para cambiarla: edítala en el gestor, descárgala (csv) y reemplaza aquí su `invitacion.csv`.
