import Link from "next/link";
import { registrarProfesional } from "@/lib/actions/auth";
import { APP_NAME } from "@/lib/config";
import { BotonPrimario, Campo, Card, inputClase } from "@/components/ui";

export default async function RegistroPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <Card className="w-full max-w-md space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold text-primary">{APP_NAME}</h1>
          <p className="text-sm text-ink/60">
            Cuenta profesional — exclusiva para psicólogos/as
          </p>
        </div>
        {error && (
          <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}
        <form action={registrarProfesional} className="space-y-4">
          <Campo label="Nombre completo">
            <input name="nombre" required className={inputClase} />
          </Campo>
          <Campo label="N° registro (Superintendencia de Salud)">
            <input name="n_registro" className={inputClase} />
          </Campo>
          <Campo label="Email">
            <input name="email" type="email" required className={inputClase} />
          </Campo>
          <Campo label="Contraseña">
            <input
              name="password"
              type="password"
              required
              minLength={8}
              className={inputClase}
            />
          </Campo>
          <BotonPrimario type="submit" className="w-full">
            Crear cuenta
          </BotonPrimario>
        </form>
        <p className="text-center text-sm text-ink/60">
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" className="text-primary hover:underline">
            Inicia sesión
          </Link>
        </p>
      </Card>
    </main>
  );
}
