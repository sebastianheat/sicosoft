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

/**
 * Firma digital (reunión 17-jul): imagen que se estampa en los
 * informes aprobados, para no imprimir documentos solo para firmarlos.
 */
export async function guardarFirma(formData: FormData) {
  const profesional = await getProfesional();
  const archivo = formData.get("firma") as File | null;
  if (!archivo || archivo.size === 0) throw new Error("Sube una imagen de tu firma");
  if (archivo.size > 500 * 1024) throw new Error("La imagen no puede superar 500 KB");
  if (!archivo.type.startsWith("image/")) throw new Error("El archivo debe ser una imagen");

  const buffer = Buffer.from(await archivo.arrayBuffer());
  const dataUrl = `data:${archivo.type};base64,${buffer.toString("base64")}`;
  await sql`
    update profesionales set firma_data = ${dataUrl} where id = ${profesional.id}
  `;
  revalidatePath("/panel/configuracion");
}

export async function eliminarFirma() {
  const profesional = await getProfesional();
  await sql`update profesionales set firma_data = null where id = ${profesional.id}`;
  revalidatePath("/panel/configuracion");
}

export async function actualizarPerfil(formData: FormData) {
  const profesional = await getProfesional();
  await sql`
    update profesionales set
      nombre = ${String(formData.get("nombre") ?? profesional.nombre)},
      rut = ${String(formData.get("rut") ?? "") || null},
      n_registro = ${String(formData.get("n_registro") ?? "") || null},
      especialidad = ${String(formData.get("especialidad") ?? "") || null},
      membrete_texto = ${String(formData.get("membrete_texto") ?? "") || null}
    where id = ${profesional.id}
  `;
  revalidatePath("/panel/configuracion");
}
