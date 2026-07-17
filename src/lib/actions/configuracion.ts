"use server";

import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { cifrar } from "@/lib/crypto";
import { getProfesional } from "./helpers";
import type { ProveedorIA, TareaIA } from "@/lib/ai";

/** Guarda una API key BYOK cifrada (AES-256-GCM por tenant). Nunca se loguea. */
export async function guardarApiKey(formData: FormData) {
  const profesional = await getProfesional();
  const proveedor = String(formData.get("proveedor")) as ProveedorIA;
  const apiKey = String(formData.get("api_key") ?? "").trim();
  if (!apiKey) throw new Error("API key vacía");

  const keys = { ...(profesional.api_keys_cifradas ?? {}) };
  keys[proveedor] = cifrar(apiKey, profesional.id);

  await sql`
    update profesionales set api_keys_cifradas = ${sql.json(keys)}
    where id = ${profesional.id}
  `;
  revalidatePath("/panel/configuracion");
}

export async function eliminarApiKey(proveedor: string) {
  const profesional = await getProfesional();
  const keys = { ...(profesional.api_keys_cifradas ?? {}) };
  delete keys[proveedor];
  await sql`
    update profesionales set api_keys_cifradas = ${sql.json(keys)}
    where id = ${profesional.id}
  `;
  revalidatePath("/panel/configuracion");
}

/** Elección de proveedor por tarea (PRD §3.1). */
export async function guardarConfigIA(formData: FormData) {
  const profesional = await getProfesional();
  const config = { ...(profesional.config_ia ?? {}) };
  config.proveedorPorTarea = {
    resumen_sesion: String(formData.get("resumen_sesion") ?? "anthropic") as ProveedorIA,
    informe_test: String(formData.get("informe_test") ?? "anthropic") as ProveedorIA,
    transcripcion: String(formData.get("transcripcion") ?? "google") as ProveedorIA,
  } satisfies Partial<Record<TareaIA, ProveedorIA>>;

  await sql`
    update profesionales set
      config_ia = ${sql.json(JSON.parse(JSON.stringify(config)))},
      config_retencion_audio = ${sql.json({
        eliminar_audio_al_aprobar: formData.get("eliminar_audio") === "on",
      })}
    where id = ${profesional.id}
  `;
  revalidatePath("/panel/configuracion");
}

export async function actualizarPerfil(formData: FormData) {
  const profesional = await getProfesional();
  await sql`
    update profesionales set
      nombre = ${String(formData.get("nombre") ?? profesional.nombre)},
      rut = ${String(formData.get("rut") ?? "") || null},
      n_registro = ${String(formData.get("n_registro") ?? "") || null},
      especialidad = ${String(formData.get("especialidad") ?? "") || null}
    where id = ${profesional.id}
  `;
  revalidatePath("/panel/configuracion");
}
