#!/bin/sh
# Sube (o actualiza) un evento al disco de Fly: deploy/subir-evento.sh <slug> [--forzar]
#
# Siempre manda media/ (sin media/originales) y, si el evento sigue en el formato anterior,
# su layout (layout.xlsx o sus CSV por pestaña). NUNCA pisa lo que escribe la app en
# producción: invitaciones, respuestas, dedicatorias, aperturas, ajustes, respaldos ni el
# borrador del gestor.
#
# invitacion.csv (el formato nuevo) solo se sube con --forzar: en producción la edita el
# gestor, así que subirla reemplaza lo publicado allá. Antes se respalda la del servidor en
# respaldos/invitacion-subida-AAAAMMDD-HHMMSS.csv.
set -eu

slug="${1:?Uso: deploy/subir-evento.sh <slug> [--forzar]}"
case "$slug" in
  '' | *[!a-z0-9-]*) echo "El slug solo lleva minúsculas, números y guiones: $slug"; exit 1 ;;
esac
force=no
case "${2:-}" in
  '') ;;
  --forzar) force=yes ;;
  *) echo "Opción desconocida: $2 (solo --forzar)"; exit 1 ;;
esac

root="$(cd "$(dirname "$0")/.." && pwd)"
config="$root/fly.toml"
remote="/data/eventos/$slug"
cd "$root/eventos/$slug"

files=""
for f in layout.xlsx evento.csv paleta.csv tipografia.csv secciones.csv familia.csv itinerario.csv ubicaciones.csv hoteles.csv hospedaje.csv; do
  [ -f "$f" ] && files="$files $f"
done
if [ -f invitacion.csv ]; then
  if [ "$force" = yes ]; then
    files="$files invitacion.csv"
  else
    echo "invitacion.csv no se sube: en producción la edita el gestor. Para reemplazar la del servidor, usa --forzar."
  fi
fi
[ -d media ] && files="$files media"
[ -n "$files" ] || { echo "eventos/$slug no tiene nada que subir"; exit 1; }

tmp="$(mktemp -t evento)"
# shellcheck disable=SC2086
COPYFILE_DISABLE=1 tar -czf "$tmp" --exclude 'media/originales' --exclude '.DS_Store' $files

# Con --forzar, primero se guarda la invitación que había en el servidor.
backup=""
if [ "$force" = yes ]; then
  stamp="$(date +%Y%m%d-%H%M%S)"
  backup="if [ -f $remote/invitacion.csv ]; then mkdir -p $remote/respaldos && cp $remote/invitacion.csv $remote/respaldos/invitacion-subida-$stamp.csv; fi; "
fi

echo "Subiendo eventos/$slug ($(du -h "$tmp" | cut -f1))…"
fly --config "$config" machine start >/dev/null 2>&1 || true   # por si estaba apagada
fly --config "$config" ssh console -C "sh -c '${backup}mkdir -p $remote && tar -xzf - -C $remote && chown -R www-data:www-data $remote'" < "$tmp"
rm -f "$tmp"
fly --config "$config" ssh console -C "sh -c 'ls -la $remote; if [ -f $remote/borrador/invitacion.csv ]; then echo; echo AVISO: hay cambios sin publicar en el gestor. Siguen ahí: publícalos o descártalos.; fi'"
