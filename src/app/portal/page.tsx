import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { getPacienteActual } from "@/lib/actions/helpers";
import { marcarTarea, registrarCheckin } from "@/lib/actions/portal";
import { getTest } from "@/lib/tests";
import {
  Badge,
  BotonPrimario,
  Card,
  Subtitulo,
  Titulo,
  inputClase,
} from "@/components/ui";

export const dynamic = "force-dynamic";

const ANIMOS = [
  { valor: 1, emoji: "😞", label: "Muy mal" },
  { valor: 2, emoji: "🙁", label: "Mal" },
  { valor: 3, emoji: "😐", label: "Regular" },
  { valor: 4, emoji: "🙂", label: "Bien" },
  { valor: 5, emoji: "😄", label: "Muy bien" },
];

export default async function PortalPage({
  searchParams,
}: {
  searchParams: Promise<{ test?: string }>;
}) {
  const { test } = await searchParams;
  const paciente = await getPacienteActual();
  const supabase = await supabaseServer();
  const hoyIso = new Date().toISOString();
  const hoyFecha = hoyIso.slice(0, 10);

  const [{ data: proximaCita }, { data: testsPendientes }, { data: tareas }, { data: checkinHoy }] =
    await Promise.all([
      supabase
        .from("citas")
        .select("id, fecha, tipo, meet_link")
        .eq("paciente_id", paciente.id)
        .gte("fecha", hoyIso)
        .in("estado", ["agendada", "confirmada"])
        .order("fecha")
        .limit(1)
        .maybeSingle(),
      supabase
        .from("tests_aplicaciones")
        .select("id, test_codigo, estado, asignado_at")
        .eq("paciente_id", paciente.id)
        .in("estado", ["pendiente", "en_curso"])
        .order("asignado_at"),
      supabase
        .from("tareas_paciente")
        .select("id, descripcion, estado")
        .eq("paciente_id", paciente.id)
        .neq("estado", "descartada")
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("checkins_animo")
        .select("valor")
        .eq("paciente_id", paciente.id)
        .eq("fecha", hoyFecha)
        .maybeSingle(),
    ]);

  return (
    <>
      <div>
        <Titulo>Hola, {paciente.nombre.split(" ")[0]}</Titulo>
        <p className="text-sm text-ink/60">Tu espacio personal de terapia.</p>
      </div>

      {test === "respondido" && (
        <p className="rounded-lg bg-success/10 px-4 py-3 text-sm text-success">
          ✓ Test enviado. Tu psicólogo/a revisará los resultados contigo.
        </p>
      )}

      <Card>
        <Subtitulo>Mi próxima sesión</Subtitulo>
        {proximaCita ? (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm">
              {new Date(proximaCita.fecha).toLocaleString("es-CL", {
                weekday: "long",
                day: "numeric",
                month: "long",
                hour: "2-digit",
                minute: "2-digit",
              })}
              <span className="text-ink/50"> · {proximaCita.tipo}</span>
            </p>
            {proximaCita.tipo === "online" && proximaCita.meet_link ? (
              <a
                href={proximaCita.meet_link}
                target="_blank"
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-light"
              >
                Entrar a la sesión (Meet) →
              </a>
            ) : (
              <Badge>Presencial</Badge>
            )}
          </div>
        ) : (
          <p className="mt-2 text-sm text-ink/50">
            No tienes sesiones agendadas próximamente.
          </p>
        )}
      </Card>

      <Card>
        <Subtitulo>Mis tests</Subtitulo>
        {testsPendientes?.length ? (
          <ul className="mt-3 space-y-2">
            {testsPendientes.map((t) => (
              <li key={t.id} className="flex items-center justify-between">
                <span className="text-sm">
                  {getTest(t.test_codigo)?.nombreCorto ?? t.test_codigo}
                </span>
                <Link
                  href={`/portal/tests/${t.id}`}
                  className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-light"
                >
                  Responder
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-ink/50">No tienes tests pendientes.</p>
        )}
      </Card>

      <Card>
        <Subtitulo>Mis tareas</Subtitulo>
        {tareas?.length ? (
          <ul className="mt-3 space-y-2">
            {tareas.map((t) => {
              const alternar = marcarTarea.bind(
                null,
                t.id,
                t.estado !== "cumplida"
              );
              return (
                <li key={t.id} className="flex items-center justify-between gap-3">
                  <span
                    className={`text-sm ${t.estado === "cumplida" ? "text-ink/40 line-through" : ""}`}
                  >
                    {t.descripcion}
                  </span>
                  <form action={alternar}>
                    <button
                      className={`rounded border px-2 py-1 text-xs ${
                        t.estado === "cumplida"
                          ? "border-border text-ink/50"
                          : "border-success text-success hover:bg-success/10"
                      }`}
                    >
                      {t.estado === "cumplida" ? "Desmarcar" : "✓ Cumplida"}
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-ink/50">Sin tareas asignadas por ahora.</p>
        )}
      </Card>

      <Card>
        <Subtitulo>¿Cómo te sientes hoy?</Subtitulo>
        {checkinHoy ? (
          <p className="mt-2 text-sm text-success">
            ✓ Ya registraste tu ánimo hoy (
            {ANIMOS.find((a) => a.valor === checkinHoy.valor)?.label ?? checkinHoy.valor}
            ). Puedes actualizarlo si quieres.
          </p>
        ) : null}
        <form action={registrarCheckin} className="mt-3 space-y-3">
          <div className="flex justify-between gap-2">
            {ANIMOS.map((a) => (
              <label key={a.valor} className="flex-1 cursor-pointer text-center">
                <input
                  type="radio"
                  name="valor"
                  value={a.valor}
                  required
                  className="peer sr-only"
                />
                <span className="block rounded-xl border border-border py-3 text-2xl transition peer-checked:border-primary peer-checked:bg-accent-soft/30">
                  {a.emoji}
                </span>
                <span className="mt-1 block text-xs text-ink/50">{a.label}</span>
              </label>
            ))}
          </div>
          <input
            name="nota"
            placeholder="Nota opcional…"
            className={inputClase}
          />
          <BotonPrimario type="submit">Registrar</BotonPrimario>
        </form>
        <p className="mt-3 text-xs text-ink/40">
          Este registro es un formulario que solo ve tu psicólogo/a — no es un
          chat con inteligencia artificial.
        </p>
      </Card>
    </>
  );
}
