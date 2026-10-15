# Muestras de la landing

Tres invitaciones de ejemplo, con datos ficticios y sin fotos (dibujos y bloques de la paleta), sobre el tema `marfil`. Entre las tres usan todas las secciones del catálogo.

| Muestra | Abre en | Paleta |
|---|---|---|
| `demo-boda` | `/i/DemoBoda2026` | champaña |
| `demo-xv` | `/i/DemoXVAnos26` | rosa palo |
| `demo-graduacion` | `/i/DemoGradua26` | azul noche |

- Cada una lleva `demo=SI` en `ajustes.csv`: se puede abrir, confirmar y dejar dedicatoria, pero **no se guarda nada** y muestra el listón "Esta es una muestra · Cotizar".
- El contenido sale de `armar.py`: edita ahí y corre `python3 deploy/demos/armar.py`.
- En local: `deploy/demos/instalar.sh` (las copia a `eventos/`). En Fly: `deploy/demos/subir.sh` (las reemplaza completas).
- La landing enlaza a estos tokens: si cambian, cámbialos en `web/landing/`.
