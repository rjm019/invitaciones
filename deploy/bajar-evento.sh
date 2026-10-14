#!/bin/sh
# Baja un evento del disco de Fly: deploy/bajar-evento.sh <slug> [carpeta]
#
# Trae todo lo que hay en el servidor (invitacion.csv y el borrador del gestor, ajustes,
# invitaciones, respuestas, dedicatorias, aperturas, respaldos y media/) a una carpeta
# NUEVA: nunca pisa la local. Por defecto, eventos/<slug>-servidor-AAAAMMDD-HHMM/ (fuera de
# git, como todo eventos/). Sirve de respaldo y para traer lo que se hizo en el gestor.
set -eu

slug="${1:?Uso: deploy/bajar-evento.sh <slug> [carpeta]}"
case "$slug" in
  '' | *[!a-z0-9-]*) echo "El slug solo lleva minúsculas, números y guiones: $slug"; exit 1 ;;
esac

root="$(cd "$(dirname "$0")/.." && pwd)"
config="$root/fly.toml"
stamp="$(date +%Y%m%d-%H%M)"
dest="${2:-$root/eventos/$slug-servidor-$stamp}"
[ -e "$dest" ] && { echo "$dest ya existe: elige otra carpeta"; exit 1; }
remote_tmp="/tmp/bajar-$slug-$stamp.tgz"

fly --config "$config" machine start >/dev/null 2>&1 || true   # por si estaba apagada
fly --config "$config" ssh console -C "sh -c 'test -d /data/eventos/$slug || { echo No existe /data/eventos/$slug; exit 1; }; tar -czf $remote_tmp -C /data/eventos/$slug .'"

tmp="$(mktemp -d -t evento)/evento.tgz"
fly --config "$config" ssh sftp get "$remote_tmp" "$tmp"
fly --config "$config" ssh console -C "rm -f $remote_tmp"

mkdir -p "$dest"
tar -xzf "$tmp" -C "$dest"
rm -rf "$(dirname "$tmp")"
echo "Listo: $dest ($(du -sh "$dest" | cut -f1))"
ls "$dest"
