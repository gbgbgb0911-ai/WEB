#!/usr/bin/env sh
# Arma el paquete que se sube a Netlify: los archivos estáticos y las
# funciones. Solo hace falta cuando cambia el código; los productos salen
# de la base al momento y nunca necesitan desplegar.
#
# No se sube el repo entero: `scraper/data/images/originales` (598 MB) y
# `scraper/data/html` (67 MB) son intermedios regenerables, y con ellos el zip
# pasaba de 700 MB y el despliegue fallaba con 500.
#
#   sh sitio/empaquetar.sh [carpeta]     (por defecto /tmp/euchel-paquete)
#
# Copiar las funciones a mano ya costó un despliegue con la API vieja: por eso
# esto existe.
set -e

RAIZ=$(cd "$(dirname "$0")/.." && pwd)
SALIDA=${1:-/tmp/euchel-paquete}
rm -rf "$SALIDA"
mkdir -p "$SALIDA"

python3 "$RAIZ/sitio/generar.py" --salida "$SALIDA/dist"

cp -r "$RAIZ/netlify" "$SALIDA/netlify"
cp "$RAIZ/package.json" "$SALIDA/"
[ -f "$RAIZ/package-lock.json" ] && cp "$RAIZ/package-lock.json" "$SALIDA/"

# Sin comando de construcción: dist ya viene armado. Netlify solo empaqueta
# las funciones y publica. Las redirecciones y cabeceras van en
# dist/_redirects y dist/_headers, que las escribe generar.py.
sed '/^\[build\]$/,/^$/c\
[build]\
  publish = "dist"\
' "$RAIZ/netlify.toml" > "$SALIDA/netlify.toml"

echo "paquete en $SALIDA ($(du -sh "$SALIDA" | cut -f1))"
echo "funciones: $(ls "$SALIDA/netlify/functions"/*.mts | wc -l | tr -d ' ')"
