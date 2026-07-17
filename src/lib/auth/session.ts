import "server-only";
import { cookies } from "next/headers";
import { jwtVerify, SignJWT } from "jose";

/**
 * Sesión propia con JWT firmado (HS256) en cookie httpOnly.
 * Reemplaza a Supabase Auth: la base de datos es Postgres puro
 * (Neon u otra) y el control de acceso vive en la capa de datos.
 */

export const COOKIE_SESION = "sesion";
const DURACION_DIAS = 7;

export interface SesionUsuario {
  userId: string;
  rol: "profesional" | "paciente";
  nombre: string;
}

function secreto(): Uint8Array {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET no está configurada");
  return new TextEncoder().encode(s);
}

export async function firmarSesion(sesion: SesionUsuario): Promise<string> {
  return new SignJWT({ rol: sesion.rol, nombre: sesion.nombre })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(sesion.userId)
    .setIssuedAt()
    .setExpirationTime(`${DURACION_DIAS}d`)
    .sign(secreto());
}

export async function verificarToken(
  token: string
): Promise<SesionUsuario | null> {
  try {
    const { payload } = await jwtVerify(token, secreto());
    if (!payload.sub) return null;
    return {
      userId: payload.sub,
      rol: (payload.rol as SesionUsuario["rol"]) ?? "profesional",
      nombre: (payload.nombre as string) ?? "",
    };
  } catch {
    return null;
  }
}

export async function crearSesion(sesion: SesionUsuario) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_SESION, await firmarSesion(sesion), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: DURACION_DIAS * 24 * 3600,
  });
}

export async function obtenerSesion(): Promise<SesionUsuario | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_SESION)?.value;
  if (!token) return null;
  return verificarToken(token);
}

export async function cerrarSesion() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_SESION);
}
