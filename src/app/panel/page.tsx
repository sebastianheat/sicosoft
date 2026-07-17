import Link from "next/link";
import { sql } from "@/lib/db";
import { getProfesional } from "@/lib/actions/helpers";
import { Badge, Card, EstadoVacio, Subtitulo, Titulo } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const profesional = await getProfesional();

  const [citas, borradores, pagosPendientes] = await Promise.all([
    sql<
      {
        id: string;
        fecha: string;
        tipo: string;
        meet_link: string | null;
        paciente_nombre: string;
      }[]
    >`
      select c.id, c.fecha, c.tipo, c.meet_link, p.nombre as paciente_nombre
      from citas c
      join pacientes p on p.id = c.paciente_id
      where p.profesional_id = ${profesional.id}
        and c.fecha between now() and now() + interval '7 days'
        and c.estado in ('agendada', 'confirmada')
      order by c.fecha
      limit 8
    `,
    sql<{ id: string; paciente_nombre: string }[]>`
      select s.id, p.nombre as paciente_nombre
      from sesiones s
      join citas c on c.id = s.cita_id
      join pacientes p on p.id = c.paciente_id
      where p.profesional_id = ${profesional.id} and s.estado = 'borrador'
      order by s.created_at desc
      limit 5
    `,
    sql<{ id: string; monto: number }[]>`
      select pg.id, pg.monto
      from pagos pg
      join citas c on c.id = pg.cita_id
      join pacientes p on p.id = c.paciente_id
      where p.profesional_id = ${profesional.id}
        and pg.estado in ('pendiente', 'parcial')
    `,
  ]);

  const totalPendiente = pagosPendientes.reduce((acc, p) => acc + p.monto, 0);

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
          {citas.length ? (
            <ul className="divide-y divide-border">
              {citas.map((c) => (
                <li key={c.id} className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm font-medium">{c.paciente_nombre}</p>
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
            <Badge nivel="warning">{borradores.length}</Badge>
          </div>
          {borradores.length ? (
            <ul className="divide-y divide-border">
              {borradores.map((b) => (
                <li key={b.id} className="py-2">
                  <Link
                    href={`/panel/sesiones/${b.id}`}
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    Sesión de {b.paciente_nombre}
                  </Link>
                  <p className="text-xs text-ink/50">
                    Borrador de resumen esperando tu aprobación
                  </p>
                </li>
              ))}
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
            {pagosPendientes.length} sesiones por cobrar ·{" "}
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
