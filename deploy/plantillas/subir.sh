#!/bin/sh
# Sube una plantilla del repositorio al disco de Fly: deploy/plantillas/subir.sh <nombre> [--forzar]
# Crea /data/eventos/plantilla-<nombre>/ con su invitacion.csv y ajustes.csv (plantilla=SI,
# oculta), lo mismo que instalar.sh en local. Si allá ya existe no la toca: puede tener cambios
# hechos en el gestor. Con --forzar reemplaza su invitacion.csv (y suma su media), guardando
# antes la del servidor en respaldos/; sus ajustes se quedan.
set -eu
name="${1:?Uso: deploy/plantillas/subir.sh <nombre> [--forzar]  (por ejemplo: nueva-york)}"
case "$name" in
  '' | *[!a-z0-9-]*) echo "El nombre solo lleva minúsculas, números y guiones: $name"; exit 1 ;;
esac
force=no
case "${2:-}" in
  '') ;;
  --forzar) force=yes ;;
  *) echo "Opción desconocida: $2 (solo --forzar)"; exit 1 ;;
esac

here="$(cd "$(dirname "$0")" && pwd)"
config="$here/../../fly.toml"
src="$here/$name"
[ -f "$src/invitacion.csv" ] || { echo "No existe la plantilla $name (deploy/plantillas/$name/invitacion.csv)"; exit 1; }
remote="/data/eventos/plantilla-$name"

fly --config "$config" machine start >/dev/null 2>&1 || true   # por si estaba apagada
state="$(fly --config "$config" ssh console -C "sh -c 'if [ -e $remote ]; then echo existe; else echo nueva; fi'")"
case "$state" in
  *existe*) [ "$force" = yes ] || { echo "plantilla-$name ya está en el servidor: no se toca (puede tener cambios hechos en el gestor). Para reemplazar su invitacion.csv, usa --forzar."; exit 1; } ;;
  *nueva*) ;;
  *) echo "No se pudo revisar el servidor: $state"; exit 1 ;;
esac

# Lo que se sube: la invitación, su media (si trae) y, si es nueva, sus ajustes de plantilla.
stage="$(mktemp -d)"
tmp="$(mktemp)"
trap 'rm -rf "$stage" "$tmp"' EXIT
mkdir -p "$stage/media"
cp "$src/invitacion.csv" "$stage/invitacion.csv"
[ -d "$src/media" ] && cp -R "$src/media/." "$stage/media/"
files="invitacion.csv media"
backup=""
case "$state" in
  *nueva*)
    printf '\357\273\277clave,valor\r\nplantilla,SI\r\npublicado,NO\r\n' > "$stage/ajustes.csv"
    files="$files ajustes.csv"
    ;;
  *)
    stamp="$(date +%Y%m%d-%H%M%S)"
    backup="if [ -f $remote/invitacion.csv ]; then mkdir -p $remote/respaldos && cp $remote/invitacion.csv $remote/respaldos/invitacion-subida-$stamp.csv; fi; "
    ;;
esac
# shellcheck disable=SC2086
(cd "$stage" && COPYFILE_DISABLE=1 tar -czf "$tmp" --exclude '.DS_Store' $files)

echo "Subiendo plantilla-${name}…"
fly --config "$config" ssh console -C "sh -c '${backup}mkdir -p $remote && tar -xzf - -C $remote && chown -R www-data:www-data $remote'" < "$tmp"
fly --config "$config" ssh console -C "sh -c 'ls -la $remote; if [ -f $remote/borrador/invitacion.csv ]; then echo; echo AVISO: hay cambios sin publicar en el gestor. Siguen ahí: publícalos o descártalos.; fi'"
echo "Listo: está en /gestor → Plantillas."
