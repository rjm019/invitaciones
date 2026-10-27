# Muestras de la landing

Tres invitaciones de ejemplo, con datos ficticios y sin fotos (dibujos y bloques de la paleta), sobre el tema `marfil`. Entre las tres usan todas las secciones del catálogo. Una cuarta, `demo-boda-encaje`, lleva fotos libres y el tema `encaje`.

| Muestra | Abre en | Paleta |
|---|---|---|
| `demo-boda` | `/i/DemoBoda2026` | champaña |
| `demo-xv` | `/i/DemoXVAnos26` | rosa palo |
| `demo-graduacion` | `/i/DemoGradua26` | azul noche |
| `demo-boda-encaje` | `/i/DemoEncaje27` | salvia y marfil (tema `encaje`; todas las secciones; aún sin anunciar en la landing) |

- Cada una lleva `demo=SI` en `ajustes.csv`: se puede abrir, confirmar y dejar dedicatoria, pero **no se guarda nada** y muestra el listón "Esta es una muestra · Cotizar".
- El contenido sale de `armar.py`: edita ahí y corre `python3 deploy/demos/armar.py`.
- En local: `deploy/demos/instalar.sh` (las copia a `eventos/`). En Fly: `deploy/demos/subir.sh` (las reemplaza completas).
- La landing enlaza a estos tokens: si cambian, cámbialos en `web/landing/`.
- `demo-boda-encaje` trae fotos de Wikimedia Commons (CC0 o dominio público): autores y URL en `demo-boda-encaje/CREDITOS.md`. Tras instalarla en local corre `docker compose exec -T api php artisan media:miniaturas demo-boda-encaje` y copia los `*-480.webp` a su `media/` (ya están versionados). Su token tiene 12 caracteres, como exige `InvitationStore::PATTERN`.
