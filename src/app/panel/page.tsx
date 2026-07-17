import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { getProfesional } from "@/lib/actions/helpers";
import { Badge, Card, EstadoVacio, Subtitulo, Titulo } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const profesional = await getProfesional();
  const supabase = await supabaseServer();
  const hoy = new Date();
  const en7dias = new Date(hoy.getTime() + 7 * 24 * 3600 * 1000);

  const [{ data: citas }, { data: borradores }, { data: pagosPendientes }] =
    await Promise.all([
      supabase
        .from("citas")
        .select("id, fecha, tipo, meet_link, estado, pacientes(nombre)")
        .gte("fecha", hoy.toISOString())
        .lte("fecha", en7dias.toISOString())
        .in("estado", ["agendada", "confirmada"])
        .order("fecha")
        .limit(8),
      supabase
        .from("sesiones")
        .select("id, created_at, estado, citas(fecha, pacientes(nombre))")
        .eq("estado", "borrador")
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("pagos")
        .select("id, monto, estado")
        .in("estado", ["pendiente", "parcial"]),
    ]);

  const totalPendiente = (pagosPendientes ?? []).reduce(
    (acc, p) => acc + p.monto,
    0
  );

  return (
    <>
      <div>
        <Titulo>Hola, {profesional.nombre.split(" ")[0]}</Titulo>
        <p className="text-sm text-ink/60">
          Tu semana de un vistazo. La IA propone, tú decides.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <Subtitulo>Próximas citas</Subtitulo>
            <Link href="/panel/agenda" className="text-sm text-primary hover:underline">
              Ver agenda
            </Link>
          </div>
          {citas?.length ? (
            <ul className="divide-y divide-border">
              {citas.map((c) => (
                <li key={c.id} className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm font-medium">
                      {(c.pacientes as unknown as { nombre: string })?.nombre}
                    </p>
                    <p className="text-xs text-ink/50">
                      {new Date(c.fecha).toLocaleString("es-CL", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  {c.tipo === "online" && c.meet_link ? (
                    <a
                      href={c.meet_link}
                      target="_blank"
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      Meet →
                    </a>
                  ) : (
                    <Badge>{c.tipo}</Badge>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <EstadoVacio mensaje="Sin citas en los próximos 7 días" />
          )}
        </Card>

        <Card>
          <div className="mb-3 flex items-center justify-between">
            <Subtitulo>Borradores por revisar</Subtitulo>
            <Badge nivel="warning">{borradores?.length ?? 0}</Badge>
          </div>
          {borradores?.length ? (
            <ul className="divide-y divide-border">
              {borradores.map((b) => {
                const cita = b.citas as unknown as {
                  fecha: string;
                  pacientes: { nombre: string };
                } | null;
                return (
                  <li key={b.id} className="py-2">
                    <Link
                      href={`/panel/sesiones/${b.id}`}
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      Sesión de {cita?.pacientes?.nombre ?? "paciente"}
                    </Link>
                    <p className="text-xs text-ink/50">
                      Borrador de resumen esperando tu aprobación
                    </p>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EstadoVacio mensaje="No hay borradores pendientes de revisión" />
          )}
        </Card>

        <Card>
          <Subtitulo>Pagos pendientes</Subtitulo>
          <p className="mt-2 text-3xl font-semibold text-ink">
            ${totalPendiente.toLocaleString("es-CL")}
          </p>
          <p className="text-sm text-ink/50">
            {pagosPendientes?.length ?? 0} sesiones por cobrar ·{" "}
            <Link href="/panel/finanzas" className="text-primary hover:underline">
              ir a finanzas
            </Link>
          </p>
        </Card>

        <Card>
          <Subtitulo>Acciones rápidas</Subtitulo>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href="/panel/pacientes?nuevo=1"
              className="rounded-lg border border-primary px-3 py-1.5 text-sm text-primary hover:bg-accent-soft/30"
            >
              + Nuevo paciente
            </Link>
            <Link
              href="/panel/agenda?nueva=1"
              className="rounded-lg border border-primary px-3 py-1.5 text-sm text-primary hover:bg-accent-soft/30"
            >
              + Nueva cita
            </Link>
            <Link
              href="/panel/tests?asignar=1"
              className="rounded-lg border border-primary px-3 py-1.5 text-sm text-primary hover:bg-accent-soft/30"
            >
              + Asignar test
            </Link>
          </div>
        </Card>
      </div>
    </>
  );
}
