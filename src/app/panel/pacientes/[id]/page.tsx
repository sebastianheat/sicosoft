import Link from "next/link";
import { notFound } from "next/navigation";
import { sql } from "@/lib/db";
import { getProfesional } from "@/lib/actions/helpers";
import {
  actualizarFicha,
  crearLoginPaciente,
  crearTareaPaciente,
  registrarConsentimiento,
} from "@/lib/actions/pacientes";
import { getTest } from "@/lib/tests";
import {
  Badge,
  BotonPrimario,
  BotonSecundario,
  Campo,
  Card,
  EstadoVacio,
  Subtitulo,
  Titulo,
  inputClase,
} from "@/components/ui";

export const dynamic = "force-dynamic";

const TIPOS_CONSENTIMIENTO = [
  { tipo: "tratamiento", label: "Tratamiento" },
  { tipo: "grabacion", label: "Grabación de sesiones" },
  { tipo: "portal", label: "Uso de intranet" },
] as const;

export default async function FichaPacientePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profesional = await getProfesional();

  const [paciente] = await sql<
    {
      id: string;
      nombre: string;
      rut: string | null;
      email: string | null;
      telefono: string | null;
      motivo_consulta: string | null;
      anamnesis: string | null;
      estado: string;
      user_id: string | null;
      created_at: string;
    }[]
  >`
    select * from pacientes
    where id = ${id} and profesional_id = ${profesional.id}
  `;
  if (!paciente) notFound();

  const [consentimientos, citas, aplicaciones, tareas] = await Promise.all([
    sql<{ tipo: string; aceptado: boolean; fecha: string }[]>`
      select tipo, aceptado, fecha from consentimientos
      where paciente_id = ${id} order by fecha desc
    `,
    sql<
      {
        id: string;
        fecha: string;
        estado: string;
        tipo: string;
        sesion_id: string | null;
        sesion_estado: string | null;
        resumen_aprobado: string | null;
      }[]
    >`
      select c.id, c.fecha, c.estado, c.tipo,
             s.id as sesion_id, s.estado as sesion_estado, s.resumen_aprobado
      from citas c
      left join sesiones s on s.cita_id = c.id
      where c.paciente_id = ${id}
      order by c.fecha desc
      limit 20
    `,
    sql<
      {
        id: string;
        test_codigo: string;
        estado: string;
        puntaje_total: number | null;
        severidad: string | null;
        asignado_at: string;
      }[]
    >`
      select id, test_codigo, estado, puntaje_total, severidad, asignado_at
      from tests_aplicaciones
      where paciente_id = ${id}
      order by asignado_at desc
    `,
    sql<{ id: string; descripcion: string; estado: string }[]>`
      select id, descripcion, estado from tareas_paciente
      where paciente_id = ${id}
      order by created_at desc
      limit 10
    `,
  ]);

  // último consentimiento por tipo
  const ultimoConsentimiento = new Map<string, boolean>();
  for (const c of consentimientos) {
    if (!ultimoConsentimiento.has(c.tipo)) {
      ultimoConsentimiento.set(c.tipo, c.aceptado);
    }
  }

  const actualizarConId = actualizarFicha.bind(null, id);
  const consentimientoConId = registrarConsentimiento.bind(null, id);
  const tareaConId = crearTareaPaciente.bind(null, id);
  const loginConId = crearLoginPaciente.bind(null, id);

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <Titulo>{paciente.nombre}</Titulo>
          <p className="text-sm text-ink/50">
            Ficha clínica · ingresado el{" "}
            {new Date(paciente.created_at).toLocaleDateString("es-CL")}
          </p>
        </div>
        <Badge nivel={paciente.estado === "activo" ? "success" : "neutral"}>
          {paciente.estado}
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Timeline de sesiones — vista de trabajo diaria (PRD M0) */}
          <Card>
            <Subtitulo>Timeline de sesiones</Subtitulo>
            {citas.length ? (
              <ol className="mt-3 space-y-3 border-l-2 border-accent-soft pl-4">
                {citas.map((c) => (
                  <li key={c.id} className="relative">
                    <span className="absolute -left-[1.35rem] top-1.5 h-2.5 w-2.5 rounded-full bg-primary" />
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">
                        {new Date(c.fecha).toLocaleDateString("es-CL", {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                        })}{" "}
                        · {c.tipo}
                      </p>
                      <div className="flex items-center gap-2">
                        <Badge
                          nivel={
                            c.estado === "realizada"
                              ? "success"
                              : c.estado === "inasistencia"
                                ? "danger"
                                : "neutral"
                          }
                        >
                          {c.estado}
                        </Badge>
                        {c.sesion_id ? (
                          <Link
                            href={`/panel/sesiones/${c.sesion_id}`}
                            className="text-xs text-primary hover:underline"
                          >
                            {c.sesion_estado === "aprobado"
                              ? "Ver resumen"
                              : "Revisar sesión"}
                          </Link>
                        ) : null}
                      </div>
                    </div>
                    {c.resumen_aprobado && (
                      <p className="mt-1 line-clamp-2 text-xs text-ink/60">
                        {c.resumen_aprobado}
                      </p>
                    )}
                  </li>
                ))}
              </ol>
            ) : (
              <EstadoVacio mensaje="Sin sesiones registradas todavía" />
            )}
          </Card>

          {/* Ficha editable */}
          <Card>
            <Subtitulo>Motivo de consulta y anamnesis</Subtitulo>
            <form action={actualizarConId} className="mt-3 space-y-4">
              <Campo label="Motivo de consulta">
                <textarea
                  name="motivo_consulta"
                  rows={2}
                  defaultValue={paciente.motivo_consulta ?? ""}
                  className={inputClase}
                />
              </Campo>
              <Campo label="Anamnesis">
                <textarea
                  name="anamnesis"
                  rows={6}
                  defaultValue={paciente.anamnesis ?? ""}
                  className={inputClase}
                />
              </Campo>
              <Campo label="Estado del paciente">
                <select
                  name="estado"
                  defaultValue={paciente.estado}
                  className={inputClase}
                >
                  <option value="activo">Activo</option>
                  <option value="alta">Alta</option>
                  <option value="inactivo">Inactivo</option>
                </select>
              </Campo>
              <BotonPrimario type="submit">Guardar ficha</BotonPrimario>
            </form>
          </Card>

          {/* Tests del paciente */}
          <Card>
            <div className="flex items-center justify-between">
              <Subtitulo>Tests aplicados</Subtitulo>
              <Link
                href={`/panel/tests?asignar=1&paciente=${id}`}
                className="text-sm text-primary hover:underline"
              >
                + Asignar test
              </Link>
            </div>
            {aplicaciones.length ? (
              <ul className="mt-3 divide-y divide-border">
                {aplicaciones.map((a) => (
                  <li key={a.id} className="flex items-center justify-between py-2">
                    <div>
                      <Link
                        href={`/panel/tests/${a.id}`}
                        className="text-sm font-medium text-primary hover:underline"
                      >
                        {getTest(a.test_codigo)?.nombreCorto ?? a.test_codigo}
                      </Link>
                      <p className="text-xs text-ink/50">
                        {new Date(a.asignado_at).toLocaleDateString("es-CL")}
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
                  </li>
                ))}
              </ul>
            ) : (
              <EstadoVacio mensaje="Sin tests aplicados" />
            )}
          </Card>
        </div>

        <div className="space-y-6">
          {/* Consentimientos (PRD M0): separables por finalidad */}
          <Card>
            <Subtitulo>Consentimientos</Subtitulo>
            <ul className="mt-3 space-y-2">
              {TIPOS_CONSENTIMIENTO.map(({ tipo, label }) => {
                const estado = ultimoConsentimiento.get(tipo);
                return (
                  <li key={tipo} className="flex items-center justify-between">
                    <span className="text-sm">{label}</span>
                    <Badge
                      nivel={
                        estado === true
                          ? "success"
                          : estado === false
                            ? "danger"
                            : "neutral"
                      }
                    >
                      {estado === true
                        ? "Aceptado"
                        : estado === false
                          ? "Rechazado"
                          : "Pendiente"}
                    </Badge>
                  </li>
                );
              })}
            </ul>
            <form action={consentimientoConId} className="mt-4 space-y-3">
              <Campo label="Registrar consentimiento">
                <select name="tipo" className={inputClase}>
                  {TIPOS_CONSENTIMIENTO.map(({ tipo, label }) => (
                    <option key={tipo} value={tipo}>
                      {label}
                    </option>
                  ))}
                </select>
              </Campo>
              <div className="flex gap-2">
                <BotonPrimario type="submit" name="aceptado" value="si">
                  Aceptado
                </BotonPrimario>
                <BotonSecundario type="submit" name="aceptado" value="no">
                  Rechazado
                </BotonSecundario>
              </div>
              <p className="text-xs text-ink/50">
                Sin consentimiento de grabación aceptado, el módulo de sesiones
                no permite procesar audio (Ley 21.719).
              </p>
            </form>
          </Card>

          {/* Acceso a la intranet del paciente (PRD M5) */}
          <Card>
            <Subtitulo>Intranet del paciente</Subtitulo>
            {paciente.user_id ? (
              <p className="mt-2 text-sm text-success">
                ✓ Acceso activo. El paciente entra en{" "}
                <span className="font-medium">/login</span> con su email.
              </p>
            ) : (
              <form action={loginConId} className="mt-3 space-y-3">
                <p className="text-xs text-ink/50">
                  Crea el acceso y entrégale la clave al paciente (idealmente
                  con su consentimiento de uso de intranet registrado).
                </p>
                <Campo label="Email del paciente">
                  <input
                    name="email"
                    type="email"
                    required
                    defaultValue={paciente.email ?? ""}
                    className={inputClase}
                  />
                </Campo>
                <Campo label="Contraseña inicial (mín. 8 caracteres)">
                  <input
                    name="password"
                    type="text"
                    required
                    minLength={8}
                    className={inputClase}
                    autoComplete="off"
                  />
                </Campo>
                <BotonPrimario type="submit">Crear acceso</BotonPrimario>
              </form>
            )}
          </Card>

          {/* Tareas terapéuticas */}
          <Card>
            <Subtitulo>Tareas asignadas</Subtitulo>
            {tareas.length ? (
              <ul className="mt-3 space-y-2">
                {tareas.map((t) => (
                  <li key={t.id} className="flex items-center justify-between gap-2">
                    <span
                      className={`text-sm ${t.estado === "cumplida" ? "text-ink/40 line-through" : ""}`}
                    >
                      {t.descripcion}
                    </span>
                    <Badge nivel={t.estado === "cumplida" ? "success" : "neutral"}>
                      {t.estado}
                    </Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-ink/50">Sin tareas asignadas</p>
            )}
            <form action={tareaConId} className="mt-4 space-y-2">
              <input
                name="descripcion"
                placeholder="Nueva tarea para el paciente…"
                required
                className={inputClase}
              />
              <BotonPrimario type="submit">Asignar tarea</BotonPrimario>
            </form>
          </Card>

          {/* Datos de contacto */}
          <Card>
            <Subtitulo>Contacto</Subtitulo>
            <dl className="mt-2 space-y-1 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink/50">RUT</dt>
                <dd>{paciente.rut ?? "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink/50">Email</dt>
                <dd>{paciente.email ?? "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink/50">Teléfono</dt>
                <dd>{paciente.telefono ?? "—"}</dd>
              </div>
            </dl>
          </Card>
        </div>
      </div>
    </>
  );
}
