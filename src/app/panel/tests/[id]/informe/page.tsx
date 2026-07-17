import Link from "next/link";
import { notFound } from "next/navigation";
import { sql } from "@/lib/db";
import { getProfesional } from "@/lib/actions/helpers";
import { getTest } from "@/lib/tests";
import { BotonImprimir } from "@/components/boton-imprimir";

export const dynamic = "force-dynamic";

/**
 * Informe formal imprimible (reunión 17-jul): membrete del profesional,
 * resultados, interpretación aprobada y firma digital. "Guardar como PDF"
 * usa la impresión del navegador — cero dependencias.
 */
export default async function InformeImprimiblePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profesional = await getProfesional();

  const [aplicacion] = await sql<
    {
      test_codigo: string;
      estado: string;
      puntaje_total: number | null;
      severidad: string | null;
      subescalas:
        | { nombre: string; puntaje: number; severidad: string | null }[]
        | null;
      interpretacion_aprobada: string | null;
      aprobado_at: string | null;
      respondido_at: string | null;
      paciente_nombre: string;
      paciente_rut: string | null;
    }[]
  >`
    select t.test_codigo, t.estado, t.puntaje_total, t.severidad, t.subescalas,
           t.interpretacion_aprobada, t.aprobado_at, t.respondido_at,
           p.nombre as paciente_nombre, p.rut as paciente_rut
    from tests_aplicaciones t
    join pacientes p on p.id = t.paciente_id
    where t.id = ${id} and p.profesional_id = ${profesional.id}
  `;
  if (!aplicacion || aplicacion.estado !== "aprobado") notFound();

  const def = getTest(aplicacion.test_codigo);
  if (!def) notFound();

  const subescalas = (aplicacion.subescalas ?? []).filter(
    (s) => s.puntaje > 0 || s.severidad
  );

  return (
    <div className="mx-auto max-w-3xl bg-white p-10 text-ink print:p-0">
      <div className="mb-6 flex items-center justify-between print:hidden">
        <Link
          href={`/panel/tests/${id}`}
          className="text-sm text-primary hover:underline"
        >
          ← Volver a la aplicación
        </Link>
        <BotonImprimir />
      </div>

      {/* Membrete */}
      <header className="border-b-2 border-primary pb-4">
        <h1 className="text-xl font-semibold text-primary">
          {profesional.nombre}
        </h1>
        <p className="text-sm text-ink/70">
          Psicólogo/a{profesional.especialidad ? ` · ${profesional.especialidad}` : ""}
          {profesional.n_registro ? ` · N° registro ${profesional.n_registro}` : ""}
        </p>
        {profesional.membrete_texto && (
          <p className="mt-1 text-xs text-ink/50">{profesional.membrete_texto}</p>
        )}
      </header>

      <section className="mt-6 space-y-1 text-sm">
        <h2 className="text-lg font-semibold">
          Informe de resultados — {def.nombreCorto}
        </h2>
        <p className="text-ink/70">{def.nombre}</p>
        <div className="mt-3 grid grid-cols-2 gap-1">
          <p>
            <span className="text-ink/50">Paciente:</span>{" "}
            {aplicacion.paciente_nombre}
          </p>
          {aplicacion.paciente_rut && (
            <p>
              <span className="text-ink/50">RUT:</span> {aplicacion.paciente_rut}
            </p>
          )}
          <p>
            <span className="text-ink/50">Fecha de aplicación:</span>{" "}
            {aplicacion.respondido_at
              ? new Date(aplicacion.respondido_at).toLocaleDateString("es-CL")
              : "—"}
          </p>
          <p>
            <span className="text-ink/50">Fecha del informe:</span>{" "}
            {aplicacion.aprobado_at
              ? new Date(aplicacion.aprobado_at).toLocaleDateString("es-CL")
              : "—"}
          </p>
        </div>
      </section>

      {(aplicacion.puntaje_total !== null || subescalas.length > 0) && (
        <section className="mt-6 rounded-lg border border-border p-4 text-sm print:border-ink/30">
          <h3 className="font-semibold">Resumen de puntajes</h3>
          {aplicacion.puntaje_total !== null && def.rangos.length > 0 && (
            <p className="mt-2">
              Puntaje total: <strong>{aplicacion.puntaje_total}</strong>
              {aplicacion.severidad && ` — ${aplicacion.severidad}`}
            </p>
          )}
          {subescalas.length > 0 && (
            <ul className="mt-2 space-y-1">
              {subescalas.map((s) => (
                <li key={s.nombre}>
                  {s.nombre}: <strong>{s.puntaje}</strong>
                  {s.severidad && ` — ${s.severidad}`}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section className="mt-6">
        <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-ink/90">
          {aplicacion.interpretacion_aprobada}
        </pre>
      </section>

      {/* Firma */}
      <footer className="mt-12 flex flex-col items-end">
        {profesional.firma_data && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profesional.firma_data}
            alt="Firma"
            className="max-h-20"
          />
        )}
        <p className="mt-1 border-t border-ink/40 pt-1 text-sm font-medium">
          {profesional.nombre}
        </p>
        <p className="text-xs text-ink/60">
          {profesional.n_registro
            ? `N° registro ${profesional.n_registro}`
            : "Psicólogo/a"}
        </p>
      </footer>
    </div>
  );
}
