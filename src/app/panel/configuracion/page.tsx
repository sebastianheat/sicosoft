import Link from "next/link";
import { getProfesional } from "@/lib/actions/helpers";
import {
  actualizarPerfil,
  eliminarApiKey,
  eliminarFirma,
  guardarApiKey,
  guardarConfigIA,
  guardarFirma,
} from "@/lib/actions/configuracion";
import {
  Badge,
  BotonPrimario,
  Campo,
  Card,
  Subtitulo,
  Titulo,
  inputClase,
} from "@/components/ui";
import type { ProveedorIA } from "@/lib/ai";

export const dynamic = "force-dynamic";

const PROVEEDORES: { id: ProveedorIA; nombre: string }[] = [
  { id: "anthropic", nombre: "Anthropic (Claude)" },
  { id: "openai", nombre: "OpenAI (GPT)" },
  { id: "google", nombre: "Google (Gemini)" },
];

export default async function ConfiguracionPage() {
  const profesional = await getProfesional();
  const keys = profesional.api_keys_cifradas ?? {};
  const porTarea = profesional.config_ia?.proveedorPorTarea ?? {};

  return (
    <>
      <div>
        <Titulo>Configuración</Titulo>
        <p className="text-sm text-ink/60">
          Tu cuenta, tus modelos de IA (BYOK) y tus políticas de datos.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <Subtitulo>Perfil profesional</Subtitulo>
          <form action={actualizarPerfil} className="mt-3 space-y-3">
            <Campo label="Nombre">
              <input
                name="nombre"
                defaultValue={profesional.nombre}
                className={inputClase}
              />
            </Campo>
            <Campo label="RUT">
              <input name="rut" defaultValue={profesional.rut ?? ""} className={inputClase} />
            </Campo>
            <Campo label="N° registro (Superintendencia de Salud)">
              <input
                name="n_registro"
                defaultValue={profesional.n_registro ?? ""}
                className={inputClase}
              />
            </Campo>
            <Campo label="Especialidad">
              <input
                name="especialidad"
                defaultValue={profesional.especialidad ?? ""}
                className={inputClase}
              />
            </Campo>
            <Campo label="Membrete de informes (encabezado personalizado)">
              <textarea
                name="membrete_texto"
                rows={2}
                defaultValue={profesional.membrete_texto ?? ""}
                placeholder="Ej: Consulta Psicológica — Av. Providencia 123, Santiago"
                className={inputClase}
              />
            </Campo>
            <BotonPrimario type="submit">Guardar perfil</BotonPrimario>
          </form>
        </Card>

        <Card>
          <Subtitulo>Firma digital</Subtitulo>
          <p className="mt-1 text-xs text-ink/50">
            Sube una foto de tu firma: se estampa automáticamente en los
            informes aprobados, sin necesidad de imprimir para firmar.
          </p>
          {profesional.firma_data ? (
            <div className="mt-3 space-y-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={profesional.firma_data}
                alt="Firma del profesional"
                className="max-h-24 rounded-lg border border-border bg-white p-2"
              />
              <form action={eliminarFirma}>
                <button className="text-sm text-danger hover:underline">
                  Eliminar firma
                </button>
              </form>
            </div>
          ) : (
            <form action={guardarFirma} className="mt-3 space-y-3">
              <input
                type="file"
                name="firma"
                accept="image/*"
                required
                className="block w-full text-sm text-ink/70 file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-primary-light"
              />
              <BotonPrimario type="submit">Guardar firma</BotonPrimario>
            </form>
          )}
        </Card>

        <Card>
          <Subtitulo>Modelos de IA — Bring Your Own Key</Subtitulo>
          <p className="mt-1 text-xs text-ink/50">
            Conecta tu propia consola. Las keys se cifran (AES-256) con clave
            por cuenta y nunca se registran en logs. Solo se usan endpoints API
            con no-entrenamiento garantizado.
          </p>
          <ul className="mt-3 space-y-2">
            {PROVEEDORES.map((p) => {
              const conectada = !!keys[p.id];
              const eliminar = eliminarApiKey.bind(null, p.id);
              return (
                <li key={p.id} className="flex items-center justify-between">
                  <span className="text-sm">{p.nombre}</span>
                  <span className="flex items-center gap-2">
                    <Badge nivel={conectada ? "success" : "neutral"}>
                      {conectada ? "Conectada" : "Sin conectar"}
                    </Badge>
                    {conectada && (
                      <form action={eliminar}>
                        <button className="text-xs text-danger hover:underline">
                          Quitar
                        </button>
                      </form>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
          <form action={guardarApiKey} className="mt-4 space-y-3 border-t border-border pt-3">
            <Campo label="Proveedor">
              <select name="proveedor" className={inputClase}>
                {PROVEEDORES.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo label="API key">
              <input
                name="api_key"
                type="password"
                required
                placeholder="sk-…"
                className={inputClase}
                autoComplete="off"
              />
            </Campo>
            <BotonPrimario type="submit">Guardar key cifrada</BotonPrimario>
          </form>
        </Card>

        <Card>
          <Subtitulo>Modelo por tarea</Subtitulo>
          <form action={guardarConfigIA} className="mt-3 space-y-3">
            <Campo label="Resúmenes de sesión">
              <select
                name="resumen_sesion"
                defaultValue={porTarea.resumen_sesion ?? "anthropic"}
                className={inputClase}
              >
                {PROVEEDORES.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo label="Informes de tests">
              <select
                name="informe_test"
                defaultValue={porTarea.informe_test ?? "anthropic"}
                className={inputClase}
              >
                {PROVEEDORES.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo label="Transcripción">
              <select
                name="transcripcion"
                defaultValue={porTarea.transcripcion ?? "google"}
                className={inputClase}
              >
                {PROVEEDORES.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </select>
            </Campo>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="eliminar_audio"
                defaultChecked={
                  profesional.config_retencion_audio?.eliminar_audio_al_aprobar ??
                  true
                }
              />
              Eliminar el audio automáticamente al aprobar el resumen
              (minimización de datos, Ley 21.719)
            </label>
            <BotonPrimario type="submit">Guardar preferencias</BotonPrimario>
          </form>
        </Card>

        <Card>
          <Subtitulo>Integraciones</Subtitulo>
          <p className="mt-1 text-xs">
            <Link href="/panel/ayuda/google" className="text-primary hover:underline">
              📖 Tutorial: configura Google para grabar tus sesiones →
            </Link>
          </p>
          <ul className="mt-3 space-y-2 text-sm">
            {[
              ["Google Calendar + Meet", "Agenda sincronizada y link de Meet automático"],
              ["Gemini STT", "Transcripción nativa de sesiones grabadas en Meet"],
              ["Fintoc", "Conciliación bancaria automática"],
              ["WhatsApp Cloud API", "Recordatorios de cita y links de test"],
              ["Stripe", "Suscripción y compra de tokens"],
            ].map(([nombre, desc]) => (
              <li key={nombre} className="flex items-center justify-between gap-2">
                <div>
                  <p className="font-medium">{nombre}</p>
                  <p className="text-xs text-ink/50">{desc}</p>
                </div>
                <Badge nivel="neutral">Próximamente</Badge>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
