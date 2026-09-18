import { createRemoteJWKSet, jwtVerify } from "jose";

/* Verificación de sesión para el panel.
 *
 * El navegador manda el JWT de Neon Auth como Bearer. Aquí se comprueba la
 * firma contra el JWKS de Neon y se lee el rol desde la base — no desde el
 * token, porque el JWT de Neon no admite claims propios y su `role` dice
 * "authenticated" para todos.
 *
 * Roles: 'admin' y 'trabajadora'. Cualquier otro (incluido quien se registre
 * por su cuenta) no puede hacer nada.
 */

export type Rol = "admin" | "trabajadora";
export type Sesion = { id: string; email: string; nombre: string; rol: Rol };

const BASE = () => (Netlify.env.get("NEON_AUTH_BASE_URL") || "").replace(/\/+$/, "");

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;
function claves() {
  if (!jwks) {
    const base = BASE();
    if (!base) throw new Error("falta NEON_AUTH_BASE_URL");
    // createRemoteJWKSet cachea las claves y las recarga si cambia el kid.
    jwks = createRemoteJWKSet(new URL(`${base}/.well-known/jwks.json`));
  }
  return jwks;
}

export class SinPermiso extends Error {
  constructor(public estado: number, mensaje: string) {
    super(mensaje);
  }
}

/** Verifica el Bearer y devuelve la sesión, o lanza SinPermiso. */
export async function sesionDe(req: Request, sql: any, rolesPermitidos: Rol[]): Promise<Sesion> {
  const cabecera = req.headers.get("authorization") || "";
  const token = cabecera.startsWith("Bearer ") ? cabecera.slice(7).trim() : "";
  if (!token) throw new SinPermiso(401, "Falta la sesión");

  let sub: string;
  try {
    const { payload } = await jwtVerify(token, claves(), {
      issuer: new URL(BASE()).origin,
    });
    sub = String(payload.sub || "");
    if (!sub) throw new Error("token sin sub");
  } catch {
    throw new SinPermiso(401, "Sesión inválida o vencida");
  }

  const filas = await sql`
    select id::text as id, email, coalesce(name, '') as nombre,
           coalesce(role, '') as rol, coalesce(banned, false) as vetado
      from neon_auth."user" where id = ${sub}::uuid`;

  const u = filas[0];
  if (!u) throw new SinPermiso(401, "Usuario no encontrado");
  if (u.vetado) throw new SinPermiso(403, "Cuenta desactivada");
  if (!rolesPermitidos.includes(u.rol)) {
    throw new SinPermiso(403, "Tu cuenta no tiene permiso para esto. Pídele acceso a un administrador.");
  }

  return { id: u.id, email: u.email, nombre: u.nombre, rol: u.rol as Rol };
}

/** Deja constancia de quién cambió qué. Nunca hace fallar la operación. */
export async function anotar(
  sql: any, quien: Sesion, accion: string, entidad: string,
  entidadId: string | number, antes: unknown, despues: unknown,
) {
  try {
    await sql`
      insert into negocio.bitacora (actor, accion, entidad, entidad_id, antes, despues)
      values (${quien.email}, ${accion}, ${entidad}, ${String(entidadId)},
              ${JSON.stringify(antes)}::jsonb, ${JSON.stringify(despues)}::jsonb)`;
  } catch (e) {
    console.error("bitacora:", e instanceof Error ? e.message : e);
  }
}

export function json(cuerpo: unknown, estado = 200) {
  return new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

export function errorDe(e: unknown) {
  if (e instanceof SinPermiso) return json({ error: e.message }, e.estado);
  console.error("panel:", e instanceof Error ? e.message : e);
  return json({ error: "Algo falló de nuestro lado. Inténtalo otra vez." }, 500);
}
