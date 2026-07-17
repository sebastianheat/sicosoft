"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { auditarIA, getProfesional, providerParaTarea } from "./helpers";
import {
  promptCorreccion,
  promptResumenSesion,
  SISTEMA_RESUMEN_SESION,
} from "@/lib/ai";

/** Crea (si no existe) la sesión asociada a una cita y navega a ella. */
export async function abrirSesion(citaId: string) {
  await getProfesional();
  const supabase = await supabaseServer();
  const { data: existente } = await supabase
    .from("sesiones")
    .select("id")
    .eq("cita_id", citaId)
    .maybeSingle();
  if (existente) redirect(`/panel/sesiones/${existente.id}`);

  const { data, error } = await supabase
    .from("sesiones")
    .insert({ cita_id: citaId })
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Error al crear sesión");
  redirect(`/panel/sesiones/${data.id}`);
}

/** Fallback presencial (PRD M1): pega/dicta la transcripción o notas. */
export async function guardarTranscripcion(sesionId: string, formData: FormData) {
  await getProfesional();
  const supabase = await supabaseServer();
  const { error } = await supabase
    .from("sesiones")
    .update({ transcripcion: String(formData.get("transcripcion") ?? "") })
    .eq("id", sesionId);
  if (error) throw new Error(error.message);
  revalidatePath(`/panel/sesiones/${sesionId}`);
}

/**
 * Pipeline de aprobación humana (PRD §3.1):
 * borrador → revisión del psicólogo → aprobado/corregido/rechazado.
 */
export async function generarBorradorSesion(sesionId: string) {
  const profesional = await getProfesional();
  const supabase = await supabaseServer();

  const { data: sesion } = await supabase
    .from("sesiones")
    .select("id, transcripcion, cita_id")
    .eq("id", sesionId)
    .single();
  if (!sesion?.transcripcion) {
    throw new Error("No hay transcripción para resumir");
  }

  const { provider, modelo } = providerParaTarea(profesional, "resumen_sesion");
  const respuesta = await provider.generar({
    sistema: SISTEMA_RESUMEN_SESION,
    usuario: promptResumenSesion(sesion.transcripcion),
  });

  const { error } = await supabase
    .from("sesiones")
    .update({
      borrador_ia: respuesta.texto,
      estado: "borrador",
      modelo_ia_usado: respuesta.modelo,
    })
    .eq("id", sesionId);
  if (error) throw new Error(error.message);

  await auditarIA({
    profesionalId: profesional.id,
    recurso: `sesion:${sesionId}`,
    modelo,
    accion: "generado",
    tokensInput: respuesta.tokensInput,
    tokensOutput: respuesta.tokensOutput,
  });
  revalidatePath(`/panel/sesiones/${sesionId}`);
}

/** Corrección vía prompt: "acorta X, agrega Y" (PRD M1). */
export async function corregirBorradorConPrompt(
  sesionId: string,
  formData: FormData
) {
  const profesional = await getProfesional();
  const supabase = await supabaseServer();
  const instruccion = String(formData.get("instruccion") ?? "");

  const { data: sesion } = await supabase
    .from("sesiones")
    .select("borrador_ia")
    .eq("id", sesionId)
    .single();
  if (!sesion?.borrador_ia) throw new Error("No hay borrador que corregir");

  const { provider, modelo } = providerParaTarea(profesional, "resumen_sesion");
  const respuesta = await provider.generar({
    sistema: SISTEMA_RESUMEN_SESION,
    usuario: promptCorreccion(sesion.borrador_ia, instruccion),
  });

  await supabase
    .from("sesiones")
    .update({ borrador_ia: respuesta.texto, modelo_ia_usado: respuesta.modelo })
    .eq("id", sesionId);

  await auditarIA({
    profesionalId: profesional.id,
    recurso: `sesion:${sesionId}`,
    modelo,
    accion: "corregido",
    tokensInput: respuesta.tokensInput,
    tokensOutput: respuesta.tokensOutput,
  });
  revalidatePath(`/panel/sesiones/${sesionId}`);
}

/** Solo lo aprobado ingresa a la ficha. Edición manual permitida al aprobar. */
export async function aprobarResumen(sesionId: string, formData: FormData) {
  const profesional = await getProfesional();
  const supabase = await supabaseServer();
  const resumenFinal = String(formData.get("resumen") ?? "");
  const ideas = String(formData.get("ideas_proxima_sesion") ?? "");

  const { data: sesion } = await supabase
    .from("sesiones")
    .select("modelo_ia_usado, audio_url")
    .eq("id", sesionId)
    .single();

  const update: Record<string, unknown> = {
    resumen_aprobado: resumenFinal,
    ideas_proxima_sesion: ideas || null,
    estado: "aprobado",
    aprobado_at: new Date().toISOString(),
  };
  // Minimización de datos (Ley 21.719): eliminar audio tras aprobar
  if (profesional.config_retencion_audio?.eliminar_audio_al_aprobar && sesion?.audio_url) {
    update.audio_url = null;
  }

  const { error } = await supabase.from("sesiones").update(update).eq("id", sesionId);
  if (error) throw new Error(error.message);

  await auditarIA({
    profesionalId: profesional.id,
    recurso: `sesion:${sesionId}`,
    modelo: sesion?.modelo_ia_usado ?? "manual",
    accion: "aprobado",
  });
  revalidatePath(`/panel/sesiones/${sesionId}`);
}

export async function rechazarBorrador(sesionId: string) {
  const profesional = await getProfesional();
  const supabase = await supabaseServer();
  const { data: sesion } = await supabase
    .from("sesiones")
    .select("modelo_ia_usado")
    .eq("id", sesionId)
    .single();
  const { error } = await supabase
    .from("sesiones")
    .update({ borrador_ia: null, estado: "rechazado" })
    .eq("id", sesionId);
  if (error) throw new Error(error.message);
  await auditarIA({
    profesionalId: profesional.id,
    recurso: `sesion:${sesionId}`,
    modelo: sesion?.modelo_ia_usado ?? "desconocido",
    accion: "rechazado",
  });
  revalidatePath(`/panel/sesiones/${sesionId}`);
}
