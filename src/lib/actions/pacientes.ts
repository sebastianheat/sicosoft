"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { getProfesional } from "./helpers";

export async function crearPaciente(formData: FormData) {
  const profesional = await getProfesional();
  const supabase = await supabaseServer();

  const { data, error } = await supabase
    .from("pacientes")
    .insert({
      profesional_id: profesional.id,
      nombre: String(formData.get("nombre") ?? ""),
      rut: String(formData.get("rut") ?? "") || null,
      email: String(formData.get("email") ?? "") || null,
      telefono: String(formData.get("telefono") ?? "") || null,
      motivo_consulta: String(formData.get("motivo_consulta") ?? "") || null,
    })
    .select("id")
    .single();

  if (error || !data) {
    redirect(`/panel/pacientes?error=${encodeURIComponent(error?.message ?? "Error")}`);
  }
  revalidatePath("/panel/pacientes");
  redirect(`/panel/pacientes/${data.id}`);
}

export async function actualizarFicha(pacienteId: string, formData: FormData) {
  await getProfesional();
  const supabase = await supabaseServer();
  const { error } = await supabase
    .from("pacientes")
    .update({
      motivo_consulta: String(formData.get("motivo_consulta") ?? "") || null,
      anamnesis: String(formData.get("anamnesis") ?? "") || null,
      estado: String(formData.get("estado") ?? "activo"),
    })
    .eq("id", pacienteId);
  if (error) throw new Error(error.message);
  revalidatePath(`/panel/pacientes/${pacienteId}`);
}

/**
 * Consentimiento informado (PRD M0): registro separado por finalidad.
 * Sin consentimiento de grabación activo, sesiones no permite grabar.
 */
export async function registrarConsentimiento(
  pacienteId: string,
  formData: FormData
) {
  await getProfesional();
  const supabase = await supabaseServer();
  const tipo = String(formData.get("tipo"));
  const aceptado = formData.get("aceptado") === "si";
  const { error } = await supabase.from("consentimientos").insert({
    paciente_id: pacienteId,
    tipo,
    aceptado,
    version_texto: "v1-2026",
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/panel/pacientes/${pacienteId}`);
}

export async function crearTareaPaciente(pacienteId: string, formData: FormData) {
  await getProfesional();
  const supabase = await supabaseServer();
  const { error } = await supabase.from("tareas_paciente").insert({
    paciente_id: pacienteId,
    descripcion: String(formData.get("descripcion") ?? ""),
    origen: "manual",
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/panel/pacientes/${pacienteId}`);
}

/** Consentimiento de grabación vigente (última versión aceptada). */
export async function tieneConsentimientoGrabacion(
  pacienteId: string
): Promise<boolean> {
  const supabase = await supabaseServer();
  const { data } = await supabase
    .from("consentimientos")
    .select("aceptado, fecha")
    .eq("paciente_id", pacienteId)
    .eq("tipo", "grabacion")
    .order("fecha", { ascending: false })
    .limit(1);
  return data?.[0]?.aceptado === true;
}
