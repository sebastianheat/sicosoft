import Link from "next/link";
import { login } from "@/lib/actions/auth";
import { APP_NAME } from "@/lib/config";
import { BotonPrimario, Campo, Card, inputClase } from "@/components/ui";

export default async function LoginPage({
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
          <p className="text-sm text-ink/60">Inicia sesión en tu cuenta</p>
        </div>
        {error && (
          <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}
        <form action={login} className="space-y-4">
          <Campo label="Email">
            <input name="email" type="email" required className={inputClase} />
          </Campo>
          <Campo label="Contraseña">
            <input
              name="password"
              type="password"
              required
              className={inputClase}
            />
          </Campo>
          <BotonPrimario type="submit" className="w-full">
            Entrar
          </BotonPrimario>
        </form>
        <p className="text-center text-sm text-ink/60">
          ¿Eres psicólogo/a y no tienes cuenta?{" "}
          <Link href="/registro" className="text-primary hover:underline">
            Regístrate
          </Link>
        </p>
      </Card>
    </main>
  );
}
