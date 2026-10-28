#!/bin/sh
# Copia las muestras de la landing a eventos/ (local): deploy/demos/instalar.sh
# Las muestras no guardan nada (demo=SI en ajustes.csv), así que se reemplazan completas.
set -eu
here="$(cd "$(dirname "$0")" && pwd)"
root="$(cd "$here/../.." && pwd)"
for slug in demo-boda demo-xv demo-graduacion; do
  rm -rf "$root/eventos/$slug"
  cp -R "$here/$slug" "$root/eventos/$slug"
  echo "eventos/$slug listo"
done
