import Link from "next/link";
import { sql } from "@/lib/db";
import { getProfesional } from "@/lib/actions/helpers";
import { asignarTest } from "@/lib/actions/tests";
import { getTest, LISTA_TESTS } from "@/lib/tests";
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

export default async function TestsPage({
  searchParams,
}: {
  searchParams: Promise<{ asignar?: string; paciente?: string }>;
}) {
  const { asignar, paciente } = await searchParams;
  const profesional = await getProfesional();

  const [aplicaciones, pacientes] = await Promise.all([
    sql<
      {
        id: string;
        test_codigo: string;
        estado: string;
        aplicado_via: string;
        puntaje_total: number | null;
        severidad: string | null;
        asignado_at: string;
        paciente_nombre: string;
      }[]
    >`
      select t.id, t.test_codigo, t.estado, t.aplicado_via, t.puntaje_total,
             t.severidad, t.asignado_at, p.nombre as paciente_nombre
      from tests_aplicaciones t
      join pacientes p on p.id = t.paciente_id
      where p.profesional_id = ${profesional.id}
      order by t.asignado_at desc
      limit 50
    `,
    sql<{ id: string; nombre: string }[]>`
      select id, nombre from pacientes
      where profesional_id = ${profesional.id} and estado = 'activo'
      order by nombre
    `,
  ]);

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <Titulo>Tests psicométricos</Titulo>
          <p className="text-sm text-ink/60">
            Instrumentos de libre uso con corrección automática. El paciente
            nunca queda solo frente a un instrumento: el modo por defecto es la
            aplicación en vivo supervisada.
          </p>
        </div>
        {!asignar && (
          <Link
            href="/panel/tests?asignar=1"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-light"
          >
            + Asignar test
          </Link>
        )}
      </div>

      {asignar && (
        <Card>
          <Subtitulo>Asignar test</Subtitulo>
          <form action={asignarTest} className="mt-4 grid gap-4 md:grid-cols-3">
            <Campo label="Paciente">
              <select
                name="paciente_id"
                required
                defaultValue={paciente ?? ""}
                className={inputClase}
              >
                <option value="">Selecciona…</option>
                {pacientes?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo label="Instrumento">
              <select name="test_codigo" required className={inputClase}>
                {LISTA_TESTS.map((t) => (
                  <option key={t.codigo} value={t.codigo}>
                    {t.nombreCorto} — {t.descripcion}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo label="Modo de aplicación">
              <select name="aplicado_via" className={inputClase}>
                <option value="vivo_supervisado">En vivo supervisada (por defecto)</option>
                <option value="presesion">Pre-sesión (screening)</option>
                <option value="manual">Ingreso manual del profesional</option>
              </select>
            </Campo>
            <div className="flex gap-3 md:col-span-3">
              <BotonPrimario type="submit">Asignar</BotonPrimario>
              <Link
                href="/panel/tests"
                className="rounded-lg border border-border px-4 py-2 text-sm text-ink/70"
              >
                Cancelar
              </Link>
            </div>
          </form>
        </Card>
      )}

      {aplicaciones?.length ? (
        <Card className="p-0">
          <ul className="divide-y divide-border">
            {aplicaciones.map((a) => (
              <li key={a.id}>
                <Link
                  href={`/panel/tests/${a.id}`}
                  className="flex items-center justify-between px-5 py-3 transition hover:bg-paper"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {getTest(a.test_codigo)?.nombreCorto ?? a.test_codigo} ·{" "}
                      {a.paciente_nombre}
                    </p>
                    <p className="text-xs text-ink/50">
                      {new Date(a.asignado_at).toLocaleDateString("es-CL")} ·{" "}
                      {a.aplicado_via.replace("_", " ")}
                      {a.puntaje_total !== null && ` · Puntaje ${a.puntaje_total}`}
                    </p>
                  </div>
                  <Badge
                    nivel={
                      a.estado === "aprobado"
                        ? "success"
                        : a.estado === "pendiente"
                          ? "neutral"
                          : "warning"
                    }
                  >
                    {a.severidad ?? a.estado}
                  </Badge>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      ) : (
        <EstadoVacio mensaje="Sin aplicaciones de tests todavía" />
      )}
    </>
  );
}
