import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { getProfesional } from "@/lib/actions/helpers";
import { tieneConsentimientoGrabacion } from "@/lib/actions/pacientes";
import {
  aprobarResumen,
  corregirBorradorConPrompt,
  generarBorradorSesion,
  guardarTranscripcion,
  rechazarBorrador,
} from "@/lib/actions/sesiones";
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

export default async function SesionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await getProfesional();
  const supabase = await supabaseServer();

  const { data: sesion } = await supabase
    .from("sesiones")
    .select("*, citas(id, fecha, tipo, paciente_id, pacientes(id, nombre))")
    .eq("id", id)
    .single();
  if (!sesion) notFound();

  const cita = sesion.citas as unknown as {
    id: string;
    fecha: string;
    tipo: string;
    paciente_id: string;
    pacientes: { id: string; nombre: string };
  };
  const consentimientoGrabacion = await tieneConsentimientoGrabacion(
    cita.paciente_id
  );

  const guardarConId = guardarTranscripcion.bind(null, id);
  const generarConId = generarBorradorSesion.bind(null, id);
  const corregirConId = corregirBorradorConPrompt.bind(null, id);
  const aprobarConId = aprobarResumen.bind(null, id);
  const rechazarConId = rechazarBorrador.bind(null, id);

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <Titulo>Sesión — {cita.pacientes.nombre}</Titulo>
          <p className="text-sm text-ink/50">
            {new Date(cita.fecha).toLocaleString("es-CL", {
              weekday: "long",
              day: "numeric",
              month: "long",
              hour: "2-digit",
              minute: "2-digit",
            })}{" "}
            · {cita.tipo} ·{" "}
            <Link
              href={`/panel/pacientes/${cita.pacientes.id}`}
              className="text-primary hover:underline"
            >
              ver ficha
            </Link>
          </p>
        </div>
        <Badge
          nivel={
            sesion.estado === "aprobado"
              ? "success"
              : sesion.estado === "borrador"
                ? "warning"
                : "neutral"
          }
        >
          {sesion.estado}
        </Badge>
      </div>

      {!consentimientoGrabacion && (
        <p className="rounded-lg bg-warning/10 px-4 py-3 text-sm text-warning">
          Este paciente no tiene consentimiento de grabación aceptado. Puedes
          registrar notas manuales, pero no procesar audio ni transcripciones de
          grabaciones (Ley 21.719). Regístralo en la ficha del paciente.
        </p>
      )}

      {sesion.estado === "aprobado" ? (
        <Card>
          <Subtitulo>Resumen aprobado</Subtitulo>
          <pre className="mt-3 whitespace-pre-wrap font-sans text-sm text-ink/90">
            {sesion.resumen_aprobado}
          </pre>
          {sesion.ideas_proxima_sesion && (
            <>
              <h3 className="mt-4 text-sm font-semibold">Ideas para la próxima sesión</h3>
              <pre className="mt-1 whitespace-pre-wrap font-sans text-sm text-ink/70">
                {sesion.ideas_proxima_sesion}
              </pre>
            </>
          )}
          <p className="mt-4 text-xs text-ink/40">
            Aprobado el {new Date(sesion.aprobado_at).toLocaleString("es-CL")}
            {sesion.modelo_ia_usado && ` · borrador generado por ${sesion.modelo_ia_usado}`}
          </p>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <Subtitulo>1 · Transcripción o notas</Subtitulo>
            <p className="mt-1 text-xs text-ink/50">
              Camino principal: la transcripción llega desde Meet/Gemini al
              conectar Google. Fallback presencial: pega aquí tus notas o
              dictado post-sesión.
            </p>
            <form action={guardarConId} className="mt-3 space-y-3">
              <textarea
                name="transcripcion"
                rows={14}
                defaultValue={sesion.transcripcion ?? ""}
                placeholder="Pega la transcripción o escribe tus notas de sesión…"
                className={inputClase}
              />
              <div className="flex gap-3">
                <BotonPrimario type="submit">Guardar</BotonPrimario>
              </div>
            </form>
            {sesion.transcripcion && (
              <form action={generarConId} className="mt-3">
                <BotonSecundario type="submit">
                  ✨ Generar borrador de resumen con IA
                </BotonSecundario>
              </form>
            )}
          </Card>

          <Card>
            <Subtitulo>2 · Borrador — tu aprobación decide</Subtitulo>
            {sesion.borrador_ia ? (
              <div className="mt-3 space-y-4">
                <form action={aprobarConId} className="space-y-3">
                  <Campo label="Borrador (editable — lo que apruebes ingresa a la ficha)">
                    <textarea
                      name="resumen"
                      rows={12}
                      defaultValue={sesion.borrador_ia}
                      className={inputClase}
                    />
                  </Campo>
                  <Campo label="Ideas para la próxima sesión (opcional)">
                    <textarea
                      name="ideas_proxima_sesion"
                      rows={2}
                      defaultValue={sesion.ideas_proxima_sesion ?? ""}
                      className={inputClase}
                    />
                  </Campo>
                  <div className="flex gap-3">
                    <BotonPrimario type="submit">✓ Aprobar e ingresar a la ficha</BotonPrimario>
                  </div>
                </form>
                <form action={corregirConId} className="space-y-2 border-t border-border pt-3">
                  <Campo label='Corregir vía prompt (ej: "acorta antecedentes y agrega plan de tareas")'>
                    <input name="instruccion" required className={inputClase} />
                  </Campo>
                  <div className="flex gap-3">
                    <BotonSecundario type="submit">Corregir con IA</BotonSecundario>
                  </div>
                </form>
                <form action={rechazarConId}>
                  <button className="text-sm text-danger hover:underline">
                    Rechazar borrador
                  </button>
                </form>
                {sesion.modelo_ia_usado && (
                  <p className="text-xs text-ink/40">
                    Generado por {sesion.modelo_ia_usado} — registrado en auditoría
                  </p>
                )}
              </div>
            ) : (
              <p className="mt-3 text-sm text-ink/50">
                Guarda la transcripción y genera el borrador. Nada ingresa a la
                ficha sin tu aprobación explícita.
              </p>
            )}
          </Card>
        </div>
      )}
    </>
  );
}
