import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const RUTAS_PUBLICAS = ["/", "/login", "/registro", "/auth"];

export default async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const esPublica = RUTAS_PUBLICAS.some(
    (r) => pathname === r || pathname.startsWith(`${r}/`)
  );

  if (!user && !esPublica) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // El rol (profesional | paciente) viene en metadata del usuario;
  // RLS en la base es la garantía real — esto solo enruta la UI.
  if (user) {
    const rol = (user.user_metadata?.rol as string) ?? "profesional";
    if (pathname.startsWith("/panel") && rol === "paciente") {
      return NextResponse.redirect(new URL("/portal", request.url));
    }
    if (pathname.startsWith("/portal") && rol === "profesional") {
      return NextResponse.redirect(new URL("/panel", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|ico)$).*)"],
};
