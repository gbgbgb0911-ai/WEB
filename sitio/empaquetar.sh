#!/usr/bin/env sh
# Arma el paquete que se sube a Netlify.
#
# No se sube el repo entero: `scraper/data/images/originales` (598 MB) y
# `scraper/data/html` (67 MB) son intermedios regenerables, y con ellos el zip
# pasaba de 700 MB y el despliegue fallaba con 500. Así que el sitio se
# construye aquí y se sube ya hecho, junto con las funciones.
#
#   sh sitio/empaquetar.sh [carpeta]     (por defecto /tmp/euchel-paquete)
#
# Copiar las funciones a mano ya costó un despliegue con la API vieja: por eso
# esto existe.
set -e

RAIZ=$(cd "$(dirname "$0")/.." && pwd)
SALIDA=${1:-/tmp/euchel-paquete}
: "${URL:=https://euchel-catalogo.netlify.app}"
export URL

rm -rf "$SALIDA"
mkdir -p "$SALIDA"

# El catálogo sale de la base, no del JSON del scraping: así llevan los
# precios que el equipo cambió y los productos que subió. Si no hay
# DATABASE_URL se genera del scraping, que sirve para mirar el sitio sin
# credenciales pero no refleja el panel.
if [ -n "$DATABASE_URL" ]; then
  mkdir -p "$RAIZ/sitio/data"
  node "$RAIZ/sitio/exportar.mjs" > "$RAIZ/sitio/data/catalogo.json"
else
  echo "aviso: sin DATABASE_URL, el sitio sale del scraping y no del panel" >&2
fi

python3 "$RAIZ/sitio/generar.py" --salida "$SALIDA/dist"

cp -r "$RAIZ/netlify" "$SALIDA/netlify"
cp "$RAIZ/package.json" "$SALIDA/"
[ -f "$RAIZ/package-lock.json" ] && cp "$RAIZ/package-lock.json" "$SALIDA/"

# En el paquete el sitio ya viene generado: sin comando de construcción.
# Netlify solo empaqueta las funciones y publica dist. Las redirecciones y
# cabeceras van en dist/_redirects y dist/_headers, que las genera generar.py.
sed '/^\[build\]$/,/^$/c\
[build]\
  publish = "dist"\
' "$RAIZ/netlify.toml" > "$SALIDA/netlify.toml"

echo "paquete en $SALIDA ($(du -sh "$SALIDA" | cut -f1))"
echo "funciones: $(ls "$SALIDA/netlify/functions"/*.mts | wc -l | tr -d ' ')"
