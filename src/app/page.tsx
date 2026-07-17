import Link from "next/link";
import { APP_NAME, APP_TAGLINE } from "@/lib/config";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 px-6 text-center">
      <div className="space-y-4">
        <p className="text-sm font-medium uppercase tracking-widest text-primary-light">
          Plataforma clínica con IA
        </p>
        <h1 className="text-5xl font-semibold text-ink">{APP_NAME}</h1>
        <p className="mx-auto max-w-xl text-lg text-ink/70">{APP_TAGLINE}</p>
        <p className="mx-auto max-w-xl text-sm text-ink/50">
          Transcripción y resumen de sesiones, tests psicométricos tabulados al
          instante y gestión de tu consulta — siempre bajo tu aprobación
          profesional. Cumplimiento Ley 21.719.
        </p>
      </div>
      <div className="flex gap-4">
        <Link
          href="/login"
          className="rounded-lg bg-primary px-6 py-3 text-sm font-medium text-white transition hover:bg-primary-light"
        >
          Iniciar sesión
        </Link>
        <Link
          href="/registro"
          className="rounded-lg border border-primary px-6 py-3 text-sm font-medium text-primary transition hover:bg-accent-soft/30"
        >
          Crear cuenta profesional
        </Link>
      </div>
    </main>
  );
}
