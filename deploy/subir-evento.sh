#!/bin/sh
# Sube (o actualiza) un evento al disco de Fly: deploy/subir-evento.sh <slug>
#
# Solo manda lo que editas tú: el layout (layout.xlsx o sus CSV por pestaña) y media/
# (sin media/originales). NUNCA pisa lo que escribe la app en producción: invitaciones,
# respuestas, dedicatorias, aperturas, ajustes ni respaldos.
set -eu

slug="${1:?Uso: deploy/subir-evento.sh <slug>}"
root="$(cd "$(dirname "$0")/.." && pwd)"
config="$root/fly.toml"
cd "$root/eventos/$slug"

files=""
for f in layout.xlsx evento.csv paleta.csv tipografia.csv secciones.csv familia.csv itinerario.csv ubicaciones.csv hoteles.csv hospedaje.csv; do
  [ -f "$f" ] && files="$files $f"
done
[ -d media ] && files="$files media"
[ -n "$files" ] || { echo "eventos/$slug no tiene layout"; exit 1; }

tmp="$(mktemp -t evento)"
# shellcheck disable=SC2086
COPYFILE_DISABLE=1 tar -czf "$tmp" --exclude 'media/originales' --exclude '.DS_Store' $files

echo "Subiendo eventos/$slug ($(du -h "$tmp" | cut -f1))…"
fly --config "$config" machine start >/dev/null 2>&1 || true   # por si estaba apagada
fly --config "$config" ssh console -C "sh -c 'mkdir -p /data/eventos/$slug && tar -xzf - -C /data/eventos/$slug && chown -R www-data:www-data /data/eventos/$slug'" < "$tmp"
rm -f "$tmp"
fly --config "$config" ssh console -C "ls -la /data/eventos/$slug"
