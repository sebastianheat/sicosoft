import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { getProfesional } from "@/lib/actions/helpers";
import { cambiarEstadoCita, crearCita } from "@/lib/actions/citas";
import { abrirSesion } from "@/lib/actions/sesiones";
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

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ nueva?: string; error?: string }>;
}) {
  const { nueva, error } = await searchParams;
  await getProfesional();
  const supabase = await supabaseServer();

  const desde = new Date();
  desde.setDate(desde.getDate() - 7);
  const [{ data: citas }, { data: pacientes }] = await Promise.all([
    supabase
      .from("citas")
      .select("id, fecha, duracion_min, estado, tipo, valor, meet_link, pacientes(id, nombre), sesiones(id)")
      .gte("fecha", desde.toISOString())
      .order("fecha")
      .limit(50),
    supabase
      .from("pacientes")
      .select("id, nombre")
      .eq("estado", "activo")
      .order("nombre"),
  ]);

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <Titulo>Agenda</Titulo>
          <p className="text-sm text-ink/60">
            La sincronización con Google Calendar genera el link de Meet
            automáticamente al conectar la integración.
          </p>
        </div>
        {!nueva && (
          <Link
            href="/panel/agenda?nueva=1"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-light"
          >
            + Nueva cita
          </Link>
        )}
      </div>

      {error && (
        <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
      )}

      {nueva && (
        <Card>
          <Subtitulo>Agendar cita</Subtitulo>
          <form action={crearCita} className="mt-4 grid gap-4 md:grid-cols-2">
            <Campo label="Paciente">
              <select name="paciente_id" required className={inputClase}>
                <option value="">Selecciona…</option>
                {pacientes?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo label="Tipo">
              <select name="tipo" className={inputClase}>
                <option value="online">Online (Meet)</option>
                <option value="presencial">Presencial</option>
              </select>
            </Campo>
            <Campo label="Fecha">
              <input name="fecha" type="date" required className={inputClase} />
            </Campo>
            <Campo label="Hora">
              <input name="hora" type="time" required className={inputClase} />
            </Campo>
            <Campo label="Duración (min)">
              <input
                name="duracion_min"
                type="number"
                defaultValue={50}
                className={inputClase}
              />
            </Campo>
            <Campo label="Valor sesión (CLP)">
              <input name="valor" type="number" defaultValue={0} className={inputClase} />
            </Campo>
            <div className="md:col-span-2">
              <Campo label="Link de Meet (manual mientras no esté conectado Google Calendar)">
                <input
                  name="meet_link"
                  type="url"
                  placeholder="https://meet.google.com/…"
                  className={inputClase}
                />
              </Campo>
            </div>
            <div className="flex gap-3 md:col-span-2">
              <BotonPrimario type="submit">Agendar</BotonPrimario>
              <Link
                href="/panel/agenda"
                className="rounded-lg border border-border px-4 py-2 text-sm text-ink/70"
              >
                Cancelar
              </Link>
            </div>
          </form>
        </Card>
      )}

      {citas?.length ? (
        <Card className="p-0">
          <ul className="divide-y divide-border">
            {citas.map((c) => {
              const paciente = c.pacientes as unknown as {
                id: string;
                nombre: string;
              } | null;
              const sesion = c.sesiones as unknown as { id: string }[] | { id: string } | null;
              const tieneSesion = Array.isArray(sesion) ? sesion.length > 0 : !!sesion;
              const abrirConId = abrirSesion.bind(null, c.id);
              const marcarRealizada = cambiarEstadoCita.bind(null, c.id, "realizada");
              const marcarInasistencia = cambiarEstadoCita.bind(null, c.id, "inasistencia");
              return (
                <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                  <div>
                    <p className="text-sm font-medium">
                      {paciente?.nombre}{" "}
                      <span className="font-normal text-ink/50">· {c.tipo}</span>
                    </p>
                    <p className="text-xs text-ink/50">
                      {new Date(c.fecha).toLocaleString("es-CL", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      · {c.duracion_min} min
                      {c.valor > 0 && ` · $${c.valor.toLocaleString("es-CL")}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      nivel={
                        c.estado === "realizada"
                          ? "success"
                          : c.estado === "inasistencia" || c.estado === "cancelada"
                            ? "danger"
                            : "neutral"
                      }
                    >
                      {c.estado}
                    </Badge>
                    {c.meet_link && (
                      <a
                        href={c.meet_link}
                        target="_blank"
                        className="text-xs font-medium text-primary hover:underline"
                      >
                        Meet →
                      </a>
                    )}
                    {["agendada", "confirmada"].includes(c.estado) && (
                      <>
                        <form action={marcarRealizada}>
                          <button className="rounded border border-success px-2 py-1 text-xs text-success hover:bg-success/10">
                            Realizada
                          </button>
                        </form>
                        <form action={marcarInasistencia}>
                          <button className="rounded border border-danger px-2 py-1 text-xs text-danger hover:bg-danger/10">
                            Inasistencia
                          </button>
                        </form>
                      </>
                    )}
                    <form action={abrirConId}>
                      <button className="rounded border border-primary px-2 py-1 text-xs text-primary hover:bg-accent-soft/30">
                        {tieneSesion ? "Ver sesión" : "Abrir sesión"}
                      </button>
                    </form>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      ) : (
        <EstadoVacio mensaje="Sin citas registradas en el período" />
      )}
    </>
  );
}
