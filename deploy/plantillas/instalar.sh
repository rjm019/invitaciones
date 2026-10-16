#!/bin/sh
# Instala una plantilla del repositorio en eventos/ (local): deploy/plantillas/instalar.sh <nombre>
# Crea eventos/plantilla-<nombre>/ con su invitacion.csv y ajustes.csv (plantilla=SI, oculta).
# Si ya existe no la toca: puede tener cambios hechos en el gestor.
set -eu
name="${1:?Uso: deploy/plantillas/instalar.sh <nombre>  (por ejemplo: nueva-york)}"
here="$(cd "$(dirname "$0")" && pwd)"
root="$(cd "$here/../.." && pwd)"
src="$here/$name"
dest="$root/eventos/plantilla-$name"
[ -f "$src/invitacion.csv" ] || { echo "No existe la plantilla $name (deploy/plantillas/$name/invitacion.csv)"; exit 1; }
[ -e "$dest" ] && { echo "eventos/plantilla-$name ya existe: no se toca (bórrala primero si quieres reinstalarla)"; exit 1; }
mkdir -p "$dest/media"
cp "$src/invitacion.csv" "$dest/invitacion.csv"
printf '\357\273\277clave,valor\r\nplantilla,SI\r\npublicado,NO\r\n' > "$dest/ajustes.csv"
[ -d "$src/media" ] && cp -R "$src/media/." "$dest/media/"
echo "eventos/plantilla-$name lista: ábrela en /gestor"
