import { supabaseServer } from "@/lib/supabase/server";
import { getProfesional } from "@/lib/actions/helpers";
import { registrarPago } from "@/lib/actions/pagos";
import {
  Badge,
  Card,
  EstadoVacio,
  Subtitulo,
  Titulo,
  inputClase,
} from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function FinanzasPage() {
  await getProfesional();
  const supabase = await supabaseServer();

  const inicioMes = new Date();
  inicioMes.setDate(1);
  inicioMes.setHours(0, 0, 0, 0);

  const { data: pagos } = await supabase
    .from("pagos")
    .select("id, monto, estado, metodo, conciliado_fintoc, pagado_at, created_at, citas(fecha, pacientes(nombre))")
    .order("created_at", { ascending: false })
    .limit(100);

  const pagados = (pagos ?? []).filter((p) => p.estado === "pagado");
  const ingresosMes = pagados
    .filter((p) => p.pagado_at && new Date(p.pagado_at) >= inicioMes)
    .reduce((acc, p) => acc + p.monto, 0);
  const pendientes = (pagos ?? []).filter((p) =>
    ["pendiente", "parcial"].includes(p.estado)
  );
  const totalPendiente = pendientes.reduce((acc, p) => acc + p.monto, 0);

  return (
    <>
      <div>
        <Titulo>Finanzas</Titulo>
        <p className="text-sm text-ink/60">
          Control de pagos por sesión. La conciliación bancaria automática vía
          Fintoc se activa al conectar la integración.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <p className="text-sm text-ink/50">Ingresos del mes</p>
          <p className="mt-1 text-3xl font-semibold text-success">
            ${ingresosMes.toLocaleString("es-CL")}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-ink/50">Por cobrar</p>
          <p className="mt-1 text-3xl font-semibold text-warning">
            ${totalPendiente.toLocaleString("es-CL")}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-ink/50">Sesiones cobradas (histórico)</p>
          <p className="mt-1 text-3xl font-semibold text-ink">{pagados.length}</p>
        </Card>
      </div>

      <Card className="p-0">
        <div className="border-b border-border px-5 py-3">
          <Subtitulo>Movimientos</Subtitulo>
        </div>
        {pagos?.length ? (
          <ul className="divide-y divide-border">
            {pagos.map((p) => {
              const cita = p.citas as unknown as {
                fecha: string;
                pacientes: { nombre: string };
              } | null;
              const pagar = registrarPago.bind(null, p.id);
              return (
                <li
                  key={p.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {cita?.pacientes?.nombre ?? "—"} · $
                      {p.monto.toLocaleString("es-CL")}
                    </p>
                    <p className="text-xs text-ink/50">
                      Sesión del{" "}
                      {cita
                        ? new Date(cita.fecha).toLocaleDateString("es-CL")
                        : "—"}
                      {p.conciliado_fintoc && " · conciliado (Fintoc)"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      nivel={
                        p.estado === "pagado"
                          ? "success"
                          : p.estado === "anulado"
                            ? "neutral"
                            : "warning"
                      }
                    >
                      {p.estado}
                    </Badge>
                    {["pendiente", "parcial"].includes(p.estado) && (
                      <form action={pagar} className="flex items-center gap-2">
                        <select
                          name="metodo"
                          className={`${inputClase} !w-auto !py-1 text-xs`}
                        >
                          <option value="transferencia">Transferencia</option>
                          <option value="efectivo">Efectivo</option>
                          <option value="tarjeta">Tarjeta</option>
                        </select>
                        <input type="hidden" name="estado" value="pagado" />
                        <button className="rounded border border-success px-2 py-1 text-xs text-success hover:bg-success/10">
                          Marcar pagado
                        </button>
                      </form>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="p-5">
            <EstadoVacio mensaje="Sin movimientos: al marcar una cita con valor como realizada, se genera el cobro automáticamente" />
          </div>
        )}
      </Card>
    </>
  );
}
