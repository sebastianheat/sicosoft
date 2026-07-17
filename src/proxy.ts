import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const RUTAS_PUBLICAS = ["/", "/login", "/registro"];
const COOKIE_SESION = "sesion";

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const esPublica = RUTAS_PUBLICAS.some(
    (r) => pathname === r || pathname.startsWith(`${r}/`)
  );

  const token = request.cookies.get(COOKIE_SESION)?.value;
  let rol: string | null = null;
  if (token && process.env.AUTH_SECRET) {
    try {
      const { payload } = await jwtVerify(
        token,
        new TextEncoder().encode(process.env.AUTH_SECRET)
      );
      rol = (payload.rol as string) ?? null;
    } catch {
      rol = null;
    }
  }

  if (!rol && !esPublica) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Enrutamiento por rol; la garantía real de acceso está en la capa de datos.
  if (rol) {
    if (pathname.startsWith("/panel") && rol === "paciente") {
      return NextResponse.redirect(new URL("/portal", request.url));
    }
    if (pathname.startsWith("/portal") && rol === "profesional") {
      return NextResponse.redirect(new URL("/panel", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|ico)$).*)"],
};
