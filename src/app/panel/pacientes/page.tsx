import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { getProfesional } from "@/lib/actions/helpers";
import { crearPaciente } from "@/lib/actions/pacientes";
import {
  Badge,
  BotonPrimario,
  Campo,
  Card,
  EstadoVacio,
  Subtitulo,
  Titulo,
  inputClase,
} from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function PacientesPage({
  searchParams,
}: {
  searchParams: Promise<{ nuevo?: string; error?: string }>;
}) {
  const { nuevo, error } = await searchParams;
  await getProfesional();
  const supabase = await supabaseServer();
  const { data: pacientes } = await supabase
    .from("pacientes")
    .select("id, nombre, email, estado, motivo_consulta, created_at")
    .order("created_at", { ascending: false });

  return (
    <>
      <div className="flex items-center justify-between">
        <Titulo>Pacientes</Titulo>
        {!nuevo && (
          <Link
            href="/panel/pacientes?nuevo=1"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-light"
          >
            + Nuevo paciente
          </Link>
        )}
      </div>

      {error && (
        <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
      )}

      {nuevo && (
        <Card>
          <Subtitulo>Ingresar paciente</Subtitulo>
          <form action={crearPaciente} className="mt-4 grid gap-4 md:grid-cols-2">
            <Campo label="Nombre completo">
              <input name="nombre" required className={inputClase} />
            </Campo>
            <Campo label="RUT">
              <input name="rut" className={inputClase} />
            </Campo>
            <Campo label="Email">
              <input name="email" type="email" className={inputClase} />
            </Campo>
            <Campo label="Teléfono">
              <input name="telefono" className={inputClase} />
            </Campo>
            <div className="md:col-span-2">
              <Campo label="Motivo de consulta">
                <textarea name="motivo_consulta" rows={2} className={inputClase} />
              </Campo>
            </div>
            <div className="flex gap-3 md:col-span-2">
              <BotonPrimario type="submit">Guardar</BotonPrimario>
              <Link
                href="/panel/pacientes"
                className="rounded-lg border border-border px-4 py-2 text-sm text-ink/70"
              >
                Cancelar
              </Link>
            </div>
          </form>
        </Card>
      )}

      {pacientes?.length ? (
        <Card className="p-0">
          <ul className="divide-y divide-border">
            {pacientes.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/panel/pacientes/${p.id}`}
                  className="flex items-center justify-between px-5 py-3 transition hover:bg-paper"
                >
                  <div>
                    <p className="text-sm font-medium">{p.nombre}</p>
                    <p className="line-clamp-1 text-xs text-ink/50">
                      {p.motivo_consulta ?? "Sin motivo registrado"}
                    </p>
                  </div>
                  <Badge nivel={p.estado === "activo" ? "success" : "neutral"}>
                    {p.estado}
                  </Badge>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      ) : (
        <EstadoVacio mensaje="Aún no tienes pacientes ingresados" />
      )}
    </>
  );
}
