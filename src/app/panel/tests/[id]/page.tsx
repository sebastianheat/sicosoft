import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { getProfesional } from "@/lib/actions/helpers";
import {
  aprobarInforme,
  corregirInformeConPrompt,
  generarInformeTest,
  guardarObservaciones,
  responderTest,
} from "@/lib/actions/tests";
import { getTest } from "@/lib/tests";
import { TestPlayer } from "@/components/test-player";
import {
  Badge,
  BotonPrimario,
  BotonSecundario,
  Campo,
  Card,
  Subtitulo,
  Titulo,
  inputClase,
} from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function TestDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await getProfesional();
  const supabase = await supabaseServer();

  const { data: aplicacion } = await supabase
    .from("tests_aplicaciones")
    .select("*, pacientes(id, nombre)")
    .eq("id", id)
    .single();
  if (!aplicacion) notFound();

  const def = getTest(aplicacion.test_codigo);
  if (!def) notFound();
  const paciente = aplicacion.pacientes as unknown as { id: string; nombre: string };

  const subescalas =
    (aplicacion.subescalas as
      | {
          codigo: string;
          nombre: string;
          puntaje: number;
          severidad: string | null;
          nivel: "success" | "warning" | "danger" | null;
          sobrePuntoCorte: boolean | null;
        }[]
      | null) ?? [];

  const responderConId = responderTest.bind(null, id);
  const observacionesConId = guardarObservaciones.bind(null, id);
  const generarConId = generarInformeTest.bind(null, id);
  const corregirConId = corregirInformeConPrompt.bind(null, id);
  const aprobarConId = aprobarInforme.bind(null, id);

  const pendiente = ["pendiente", "en_curso"].includes(aplicacion.estado);

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <Titulo>{def.nombreCorto} — {paciente.nombre}</Titulo>
          <p className="text-sm text-ink/50">
            {def.nombre} ·{" "}
            <Link
              href={`/panel/pacientes/${paciente.id}`}
              className="text-primary hover:underline"
            >
              ver ficha
            </Link>
          </p>
        </div>
        <Badge
          nivel={
            aplicacion.estado === "aprobado"
              ? "success"
              : pendiente
                ? "neutral"
                : "warning"
          }
        >
          {aplicacion.estado}
        </Badge>
      </div>

      {pendiente ? (
        <Card>
          <Subtitulo>Aplicación del instrumento</Subtitulo>
          <p className="mt-1 text-sm text-ink/60">
            {aplicacion.aplicado_via === "presesion"
              ? "El paciente puede responder desde su intranet antes de la sesión."
              : "Aplicación en vivo: el paciente responde en su intranet mientras supervisas, o puedes ingresar las respuestas aquí."}
          </p>
          <div className="mt-4">
            <TestPlayer def={def} action={responderConId} />
          </div>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-6">
            <Card>
              <Subtitulo>Resultados</Subtitulo>
              {aplicacion.puntaje_total !== null && def.rangos.length > 0 && (
                <div className="mt-3">
                  <p className="text-4xl font-semibold text-ink">
                    {aplicacion.puntaje_total}
                  </p>
                  {aplicacion.severidad && (
                    <p className="text-sm text-ink/70">{aplicacion.severidad}</p>
                  )}
                </div>
              )}
              {subescalas.length > 0 && (
                <ul className="mt-4 space-y-2">
                  {subescalas
                    .filter((s) => s.puntaje > 0 || s.sobrePuntoCorte !== null)
                    .map((s) => (
                      <li
                        key={s.codigo}
                        className="flex items-center justify-between gap-2 text-sm"
                      >
                        <span className="line-clamp-1">{s.nombre}</span>
                        <span className="flex items-center gap-2">
                          <span className="font-semibold">{s.puntaje}</span>
                          {s.severidad && (
                            <Badge nivel={s.nivel ?? "neutral"}>{s.severidad}</Badge>
                          )}
                        </span>
                      </li>
                    ))}
                </ul>
              )}
              <p className="mt-4 text-xs text-ink/40">
                Corrección automática según {def.fuente}
              </p>
            </Card>

            <Card>
              <Subtitulo>Observaciones del profesional</Subtitulo>
              <p className="mt-1 text-xs text-ink/50">
                Paso obligatorio antes de generar el informe: actitud del
                paciente, contexto y conducta durante la aplicación.
              </p>
              <form action={observacionesConId} className="mt-3 space-y-3">
                <textarea
                  name="observaciones"
                  rows={5}
                  defaultValue={aplicacion.observaciones_profesional ?? ""}
                  placeholder="Ej: paciente colaborador, se observa fatiga hacia el final…"
                  className={inputClase}
                />
                <BotonPrimario type="submit">Guardar observaciones</BotonPrimario>
              </form>
              {aplicacion.observaciones_profesional &&
                aplicacion.estado === "respondido" && (
                  <form action={generarConId} className="mt-3">
                    <BotonSecundario type="submit">
                      ✨ Corregir con IA — generar borrador de informe
                    </BotonSecundario>
                  </form>
                )}
            </Card>
          </div>

          <Card>
            <Subtitulo>Informe — tu aprobación decide</Subtitulo>
            {aplicacion.estado === "aprobado" ? (
              <pre className="mt-3 whitespace-pre-wrap font-sans text-sm text-ink/90">
                {aplicacion.interpretacion_aprobada}
              </pre>
            ) : aplicacion.interpretacion_borrador ? (
              <div className="mt-3 space-y-4">
                <form action={aprobarConId} className="space-y-3">
                  <Campo label="Borrador (editable — al aprobar se agrega el pie legal)">
                    <textarea
                      name="interpretacion"
                      rows={14}
                      defaultValue={aplicacion.interpretacion_borrador}
                      className={inputClase}
                    />
                  </Campo>
                  <BotonPrimario type="submit">✓ Aprobar informe</BotonPrimario>
                </form>
                <form action={corregirConId} className="space-y-2 border-t border-border pt-3">
                  <Campo label="Corregir vía prompt">
                    <input name="instruccion" required className={inputClase} />
                  </Campo>
                  <BotonSecundario type="submit">Corregir con IA</BotonSecundario>
                </form>
              </div>
            ) : (
              <p className="mt-3 text-sm text-ink/50">
                Registra tus observaciones y presiona &ldquo;Corregir con
                IA&rdquo;. El informe llegará aquí como borrador para tu
                revisión — nada se aprueba solo.
              </p>
            )}
          </Card>
        </div>
      )}
    </>
  );
}
