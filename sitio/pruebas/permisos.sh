#!/usr/bin/env sh
# Matriz de permisos contra producción. Tres sesiones: admin, equipo, y una
# cuenta registrada por su cuenta (rol 'user'), más sin sesión.
#
#   ADMIN_EMAIL=… ADMIN_CLAVE=… CLAVE_EQUIPO=… CLAVE_USER=… sh permisos.sh
#   (las cuentas qa.equipo@euchel.pe y qa.user@euchel.pe tienen que existir)
S=https://euchel-catalogo.netlify.app
A=https://ep-delicate-poetry-ar49pls1.neonauth.c-4.us-west-2.aws.neon.tech/euchel/auth
O='origin: https://euchel-catalogo.netlify.app'

entrar() {  # email clave -> imprime el JWT
  C=$(curl -sS -D - -o /dev/null -X POST "$A/sign-in/email" -H 'content-type: application/json' -H "$O" \
       -d "{\"email\":\"$1\",\"password\":\"$2\"}" | grep -i '^set-cookie' | sed 's/^set-cookie: //I' | cut -d';' -f1)
  curl -sS "$A/token" -H "cookie: $C" -H "$O" | python3 -c "import sys,json;print(json.load(sys.stdin).get('token',''))"
}

JA=$(entrar "$ADMIN_EMAIL" "$ADMIN_CLAVE")
JE=$(entrar qa.equipo@euchel.pe "$CLAVE_EQUIPO")
JU=$(entrar qa.user@euchel.pe "$CLAVE_USER")
echo "tokens: admin ${#JA} · equipo ${#JE} · user ${#JU}"

# Un producto de prueba para las escrituras, creado como admin.
PID=$(curl -sS -X POST "$S/api/panel/producto" -H "authorization: Bearer $JA" -H 'content-type: application/json' \
      -d '{"nombre":"QA PERMISOS","precio":"10"}' | python3 -c "import sys,json;print(json.load(sys.stdin)['id'])")
echo "producto de prueba: $PID"

cc() {  # curl que reintenta hasta 5 veces si el proxy corta la conexión
  for i in 1 2 3 4 5; do
    code=$(curl -sS -o /dev/null -w '%{http_code}' "$@" 2>/dev/null)
    [ "$code" != "000" ] && { echo "$code"; return; }
    sleep 1
  done
  echo 000
}
pr() {  # etiqueta metodo ruta cuerpo  -> códigos anon/user/equipo/admin
  printf '%-34s' "$1"
  for T in "" "$JU" "$JE" "$JA"; do
    if [ -n "$4" ]; then
      code=$(cc -X "$2" "$S/api/panel/$3" ${T:+-H "authorization: Bearer $T"} -H 'content-type: application/json' -d "$4")
    else
      code=$(cc -X "$2" "$S/api/panel/$3" ${T:+-H "authorization: Bearer $T"})
    fi
    printf '%6s' "$code"
  done
  echo
}

printf '%-34s%6s%6s%6s%6s\n' "" anon user equipo admin
pr "GET yo"                        GET yo
pr "GET productos"                 GET "productos?pagina=1"
pr "GET producto/:id"              GET "producto/$PID"
pr "POST producto (crear)"         POST producto '{"nombre":"QA PERMISOS 2","precio":"5"}'
pr "POST producto/:id/estado"      POST "producto/$PID/estado" '{"agotado":true}'
pr "POST producto/:id/datos"       POST "producto/$PID/datos" '{"nombre":"QA PERMISOS B"}'
pr "POST producto/:id/color"       POST "producto/$PID/color" '{"nombre":"Rojo"}'
pr "POST producto/:id/precio"      POST "producto/$PID/precio" '{"precio":"12","precio_antes":null}'
pr "POST producto/:id/archivar"    POST "producto/$PID/archivar" '{"archivado":false}'
pr "GET tablero"                   GET "tablero?dias=30"
pr "GET bitacora"                  GET "bitacora?pagina=1"
pr "DELETE producto/:id (1 tienda)" DELETE "producto/9"
echo
echo "--- auth admin (cuentas): anon/user/equipo/admin"
printf '%-34s' "GET /auth/admin/list-users"
for T in "" "$JU" "$JE" "$JA"; do
  # Estas van con cookie, no con Bearer: se usa la cookie de cada sesión.
  :
done
for par in "" "qa.user@euchel.pe:$CLAVE_USER" "qa.equipo@euchel.pe:$CLAVE_EQUIPO" "$ADMIN_EMAIL:$ADMIN_CLAVE"; do
  if [ -z "$par" ]; then code=$(cc "$A/admin/list-users?limit=1" -H "$O")
  else
    C=$(curl -sS -D - -o /dev/null -X POST "$A/sign-in/email" -H 'content-type: application/json' -H "$O" \
        -d "{\"email\":\"${par%%:*}\",\"password\":\"${par#*:}\"}" | grep -i '^set-cookie' | sed 's/^set-cookie: //I' | cut -d';' -f1)
    code=$(cc "$A/admin/list-users?limit=1" -H "cookie: $C" -H "$O")
  fi
  printf '%6s' "$code"
done
echo

# Limpieza: borrar los productos de prueba (admin), incluido el creado por "crear".
echo "--- limpieza"
for id in $(curl -sS "$S/api/panel/productos?q=QA%20PERMISOS" -H "authorization: Bearer $JA" | python3 -c "import sys,json;print(' '.join(str(p['id']) for p in json.load(sys.stdin)['productos']))"); do
  printf 'borrar %s: %s\n' "$id" "$(cc -X DELETE "$S/api/panel/producto/$id" -H "authorization: Bearer $JA")"
done
