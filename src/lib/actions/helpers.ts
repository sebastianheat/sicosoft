import "server-only";
import { sql } from "@/lib/db";
import { obtenerSesion } from "@/lib/auth/session";
import { descifrar } from "@/lib/crypto";
import {
  crearProvider,
  proveedorParaTarea,
  MODELOS_DEFAULT,
  type ConfigIAProfesional,
  type ProveedorIA,
  type TareaIA,
  type AIProvider,
} from "@/lib/ai";

export interface Profesional {
  id: string;
  user_id: string;
  nombre: string;
  rut: string | null;
  n_registro: string | null;
  especialidad: string | null;
  api_keys_cifradas: Record<string, string>;
  config_ia: ConfigIAProfesional;
  config_retencion_audio: { eliminar_audio_al_aprobar?: boolean };
  firma_data: string | null;
  membrete_texto: string | null;
}

/** Tenant del usuario autenticado; lanza si no hay sesión de profesional. */
export async function getProfesional(): Promise<Profesional> {
  const sesion = await obtenerSesion();
  if (!sesion) throw new Error("No autenticado");
  const filas = await sql<Profesional[]>`
    select * from profesionales where user_id = ${sesion.userId}
  `;
  if (!filas.length) throw new Error("Perfil de profesional no encontrado");
  return filas[0];
}

/** Paciente del usuario autenticado (rol paciente en la intranet). */
export async function getPacienteActual() {
  const sesion = await obtenerSesion();
  if (!sesion) throw new Error("No autenticado");
  const filas = await sql<
    { id: string; nombre: string; profesional_id: string }[]
  >`
    select id, nombre, profesional_id from pacientes where user_id = ${sesion.userId}
  `;
  if (!filas.length) throw new Error("Perfil de paciente no encontrado");
  return filas[0];
}

// ── Guardas de tenant ────────────────────────────────────────
// Toda operación sobre un recurso verifica que pertenezca al
// profesional autenticado antes de tocarlo (aislamiento multi-tenant).

export async function verificarPacienteDelTenant(
  pacienteId: string,
  profesionalId: string
) {
  const filas = await sql`
    select 1 from pacientes
    where id = ${pacienteId} and profesional_id = ${profesionalId}
  `;
  if (!filas.length) throw new Error("Paciente no pertenece a tu cuenta");
}

export async function verificarCitaDelTenant(
  citaId: string,
  profesionalId: string
) {
  const filas = await sql`
    select 1 from citas c
    join pacientes p on p.id = c.paciente_id
    where c.id = ${citaId} and p.profesional_id = ${profesionalId}
  `;
  if (!filas.length) throw new Error("Cita no pertenece a tu cuenta");
}

export async function verificarSesionDelTenant(
  sesionId: string,
  profesionalId: string
) {
  const filas = await sql`
    select 1 from sesiones s
    join citas c on c.id = s.cita_id
    join pacientes p on p.id = c.paciente_id
    where s.id = ${sesionId} and p.profesional_id = ${profesionalId}
  `;
  if (!filas.length) throw new Error("Sesión no pertenece a tu cuenta");
}

export async function verificarAplicacionDelTenant(
  aplicacionId: string,
  profesionalId: string
) {
  const filas = await sql`
    select 1 from tests_aplicaciones t
    join pacientes p on p.id = t.paciente_id
    where t.id = ${aplicacionId} and p.profesional_id = ${profesionalId}
  `;
  if (!filas.length) throw new Error("Aplicación no pertenece a tu cuenta");
}

// ── IA ───────────────────────────────────────────────────────

/**
 * Provider de IA para una tarea según la config del profesional (BYOK).
 * Descifra la key del proveedor elegido; error claro si no está conectada.
 */
export function providerParaTarea(
  profesional: Profesional,
  tarea: TareaIA
): { provider: AIProvider; modelo: string } {
  const config = profesional.config_ia ?? {};
  const proveedor: ProveedorIA = proveedorParaTarea(config, tarea);
  const cifrada = profesional.api_keys_cifradas?.[proveedor];
  if (!cifrada) {
    throw new Error(
      `No hay API key conectada para ${proveedor}. Configúrala en Configuración → Modelos de IA.`
    );
  }
  const apiKey = descifrar(cifrada, profesional.id);
  const modelo =
    config.modeloPorProveedor?.[proveedor] ?? MODELOS_DEFAULT[proveedor];
  return { provider: crearProvider(proveedor, apiKey, modelo), modelo };
}

/** Registro de auditoría de IA (PRD §3.1). */
export async function auditarIA(args: {
  profesionalId: string;
  recurso: string;
  modelo: string;
  accion: "generado" | "corregido" | "aprobado" | "rechazado";
  tokensInput?: number;
  tokensOutput?: number;
}) {
  await sql`
    insert into auditoria_ia (profesional_id, recurso, modelo, accion, tokens_input, tokens_output)
    values (${args.profesionalId}, ${args.recurso}, ${args.modelo}, ${args.accion},
            ${args.tokensInput ?? null}, ${args.tokensOutput ?? null})
  `;
}
