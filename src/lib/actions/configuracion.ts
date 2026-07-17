"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";
import { cifrar } from "@/lib/crypto";
import { getProfesional } from "./helpers";
import type { ProveedorIA, TareaIA } from "@/lib/ai";

/** Guarda una API key BYOK cifrada (AES-256-GCM por tenant). Nunca se loguea. */
export async function guardarApiKey(formData: FormData) {
  const profesional = await getProfesional();
  const supabase = await supabaseServer();
  const proveedor = String(formData.get("proveedor")) as ProveedorIA;
  const apiKey = String(formData.get("api_key") ?? "").trim();
  if (!apiKey) throw new Error("API key vacía");

  const keys = { ...(profesional.api_keys_cifradas ?? {}) };
  keys[proveedor] = cifrar(apiKey, profesional.id);

  const { error } = await supabase
    .from("profesionales")
    .update({ api_keys_cifradas: keys })
    .eq("id", profesional.id);
  if (error) throw new Error(error.message);
  revalidatePath("/panel/configuracion");
}

export async function eliminarApiKey(proveedor: string) {
  const profesional = await getProfesional();
  const supabase = await supabaseServer();
  const keys = { ...(profesional.api_keys_cifradas ?? {}) };
  delete keys[proveedor];
  const { error } = await supabase
    .from("profesionales")
    .update({ api_keys_cifradas: keys })
    .eq("id", profesional.id);
  if (error) throw new Error(error.message);
  revalidatePath("/panel/configuracion");
}

/** Elección de proveedor por tarea (PRD §3.1). */
export async function guardarConfigIA(formData: FormData) {
  const profesional = await getProfesional();
  const supabase = await supabaseServer();
  const config = { ...(profesional.config_ia ?? {}) };
  config.proveedorPorTarea = {
    resumen_sesion: String(formData.get("resumen_sesion") ?? "anthropic") as ProveedorIA,
    informe_test: String(formData.get("informe_test") ?? "anthropic") as ProveedorIA,
    transcripcion: String(formData.get("transcripcion") ?? "google") as ProveedorIA,
  } satisfies Partial<Record<TareaIA, ProveedorIA>>;

  const { error } = await supabase
    .from("profesionales")
    .update({
      config_ia: config,
      config_retencion_audio: {
        eliminar_audio_al_aprobar: formData.get("eliminar_audio") === "on",
      },
    })
    .eq("id", profesional.id);
  if (error) throw new Error(error.message);
  revalidatePath("/panel/configuracion");
}

export async function actualizarPerfil(formData: FormData) {
  const profesional = await getProfesional();
  const supabase = await supabaseServer();
  const { error } = await supabase
    .from("profesionales")
    .update({
      nombre: String(formData.get("nombre") ?? profesional.nombre),
      rut: String(formData.get("rut") ?? "") || null,
      n_registro: String(formData.get("n_registro") ?? "") || null,
      especialidad: String(formData.get("especialidad") ?? "") || null,
    })
    .eq("id", profesional.id);
  if (error) throw new Error(error.message);
  revalidatePath("/panel/configuracion");
}
