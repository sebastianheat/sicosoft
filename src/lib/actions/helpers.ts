import "server-only";
import { supabaseServer } from "@/lib/supabase/server";
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
}

/** Tenant del usuario autenticado; lanza si no hay sesión de profesional. */
export async function getProfesional(): Promise<Profesional> {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");
  const { data, error } = await supabase
    .from("profesionales")
    .select("*")
    .eq("user_id", user.id)
    .single();
  if (error || !data) throw new Error("Perfil de profesional no encontrado");
  return data as Profesional;
}

/** Paciente del usuario autenticado (rol paciente en la intranet). */
export async function getPacienteActual() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");
  const { data, error } = await supabase
    .from("pacientes")
    .select("id, nombre, profesional_id")
    .eq("user_id", user.id)
    .single();
  if (error || !data) throw new Error("Perfil de paciente no encontrado");
  return data;
}

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
  const supabase = await supabaseServer();
  await supabase.from("auditoria_ia").insert({
    profesional_id: args.profesionalId,
    recurso: args.recurso,
    modelo: args.modelo,
    accion: args.accion,
    tokens_input: args.tokensInput ?? null,
    tokens_output: args.tokensOutput ?? null,
  });
}
