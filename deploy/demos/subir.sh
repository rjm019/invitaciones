#!/bin/sh
# Sube las muestras de la landing al disco de Fly: deploy/demos/subir.sh
# Cada muestra se reemplaza completa (no guarda confirmaciones, dedicatorias ni visitas).
# Después, ábrelas en /i/DemoBoda2026, /i/DemoXVAnos26 y /i/DemoGradua26.
set -eu
here="$(cd "$(dirname "$0")" && pwd)"
config="$here/../../fly.toml"
fly --config "$config" machine start >/dev/null 2>&1 || true   # por si estaba apagada
for slug in demo-boda demo-xv demo-graduacion; do
  tmp="$(mktemp -t demo)"
  (cd "$here/$slug" && COPYFILE_DISABLE=1 tar -czf "$tmp" --exclude '.DS_Store' .)
  remote="/data/eventos/$slug"
  echo "Subiendo ${slug}…"
  fly --config "$config" ssh console -C "sh -c 'rm -rf $remote && mkdir -p $remote && tar -xzf - -C $remote && chown -R www-data:www-data $remote'" < "$tmp"
  rm -f "$tmp"
done
echo "Listo."
