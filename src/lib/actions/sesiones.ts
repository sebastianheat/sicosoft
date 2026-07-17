"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { sql } from "@/lib/db";
import {
  auditarIA,
  getProfesional,
  providerParaTarea,
  verificarCitaDelTenant,
  verificarSesionDelTenant,
} from "./helpers";
import {
  promptCorreccion,
  promptResumenSesion,
  SISTEMA_RESUMEN_SESION,
} from "@/lib/ai";

/** Crea (si no existe) la sesión asociada a una cita y navega a ella. */
export async function abrirSesion(citaId: string) {
  const profesional = await getProfesional();
  await verificarCitaDelTenant(citaId, profesional.id);

  const existente = await sql<{ id: string }[]>`
    select id from sesiones where cita_id = ${citaId}
  `;
  if (existente.length) redirect(`/panel/sesiones/${existente[0].id}`);

  const [sesion] = await sql<{ id: string }[]>`
    insert into sesiones (cita_id) values (${citaId}) returning id
  `;
  redirect(`/panel/sesiones/${sesion.id}`);
}

/** Fallback presencial (PRD M1): pega/dicta la transcripción o notas. */
export async function guardarTranscripcion(sesionId: string, formData: FormData) {
  const profesional = await getProfesional();
  await verificarSesionDelTenant(sesionId, profesional.id);
  await sql`
    update sesiones set transcripcion = ${String(formData.get("transcripcion") ?? "")}
    where id = ${sesionId}
  `;
  revalidatePath(`/panel/sesiones/${sesionId}`);
}

/**
 * Pipeline de aprobación humana (PRD §3.1):
 * borrador → revisión del psicólogo → aprobado/corregido/rechazado.
 */
export async function generarBorradorSesion(sesionId: string) {
  const profesional = await getProfesional();
  await verificarSesionDelTenant(sesionId, profesional.id);

  const [sesion] = await sql<{ transcripcion: string | null }[]>`
    select transcripcion from sesiones where id = ${sesionId}
  `;
  if (!sesion?.transcripcion) throw new Error("No hay transcripción para resumir");

  const { provider, modelo } = providerParaTarea(profesional, "resumen_sesion");
  const respuesta = await provider.generar({
    sistema: SISTEMA_RESUMEN_SESION,
    usuario: promptResumenSesion(sesion.transcripcion),
  });

  await sql`
    update sesiones set
      borrador_ia = ${respuesta.texto},
      estado = 'borrador',
      modelo_ia_usado = ${respuesta.modelo}
    where id = ${sesionId}
  `;

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
  await verificarSesionDelTenant(sesionId, profesional.id);
  const instruccion = String(formData.get("instruccion") ?? "");

  const [sesion] = await sql<{ borrador_ia: string | null }[]>`
    select borrador_ia from sesiones where id = ${sesionId}
  `;
  if (!sesion?.borrador_ia) throw new Error("No hay borrador que corregir");

  const { provider, modelo } = providerParaTarea(profesional, "resumen_sesion");
  const respuesta = await provider.generar({
    sistema: SISTEMA_RESUMEN_SESION,
    usuario: promptCorreccion(sesion.borrador_ia, instruccion),
  });

  await sql`
    update sesiones set
      borrador_ia = ${respuesta.texto},
      modelo_ia_usado = ${respuesta.modelo}
    where id = ${sesionId}
  `;

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
  await verificarSesionDelTenant(sesionId, profesional.id);
  const resumenFinal = String(formData.get("resumen") ?? "");
  const ideas = String(formData.get("ideas_proxima_sesion") ?? "");

  const [sesion] = await sql<
    { modelo_ia_usado: string | null; audio_url: string | null }[]
  >`select modelo_ia_usado, audio_url from sesiones where id = ${sesionId}`;

  // Minimización de datos (Ley 21.719): eliminar audio tras aprobar
  const borrarAudio =
    !!profesional.config_retencion_audio?.eliminar_audio_al_aprobar &&
    !!sesion?.audio_url;

  await sql`
    update sesiones set
      resumen_aprobado = ${resumenFinal},
      ideas_proxima_sesion = ${ideas || null},
      estado = 'aprobado',
      aprobado_at = now(),
      audio_url = ${borrarAudio ? null : (sesion?.audio_url ?? null)}
    where id = ${sesionId}
  `;

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
  await verificarSesionDelTenant(sesionId, profesional.id);
  const [sesion] = await sql<{ modelo_ia_usado: string | null }[]>`
    select modelo_ia_usado from sesiones where id = ${sesionId}
  `;
  await sql`
    update sesiones set borrador_ia = null, estado = 'rechazado'
    where id = ${sesionId}
  `;
  await auditarIA({
    profesionalId: profesional.id,
    recurso: `sesion:${sesionId}`,
    modelo: sesion?.modelo_ia_usado ?? "desconocido",
    accion: "rechazado",
  });
  revalidatePath(`/panel/sesiones/${sesionId}`);
}
