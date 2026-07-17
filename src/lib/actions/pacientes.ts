"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { sql } from "@/lib/db";
import { getProfesional, verificarPacienteDelTenant } from "./helpers";

export async function crearPaciente(formData: FormData) {
  const profesional = await getProfesional();
  const [paciente] = await sql<{ id: string }[]>`
    insert into pacientes (profesional_id, nombre, rut, email, telefono, motivo_consulta)
    values (
      ${profesional.id},
      ${String(formData.get("nombre") ?? "")},
      ${String(formData.get("rut") ?? "") || null},
      ${String(formData.get("email") ?? "") || null},
      ${String(formData.get("telefono") ?? "") || null},
      ${String(formData.get("motivo_consulta") ?? "") || null}
    )
    returning id
  `;
  revalidatePath("/panel/pacientes");
  redirect(`/panel/pacientes/${paciente.id}`);
}

export async function actualizarFicha(pacienteId: string, formData: FormData) {
  const profesional = await getProfesional();
  await verificarPacienteDelTenant(pacienteId, profesional.id);
  await sql`
    update pacientes set
      motivo_consulta = ${String(formData.get("motivo_consulta") ?? "") || null},
      anamnesis = ${String(formData.get("anamnesis") ?? "") || null},
      estado = ${String(formData.get("estado") ?? "activo")}
    where id = ${pacienteId}
  `;
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
  const profesional = await getProfesional();
  await verificarPacienteDelTenant(pacienteId, profesional.id);
  await sql`
    insert into consentimientos (paciente_id, tipo, aceptado, version_texto)
    values (
      ${pacienteId},
      ${String(formData.get("tipo"))},
      ${formData.get("aceptado") === "si"},
      'v1-2026'
    )
  `;
  revalidatePath(`/panel/pacientes/${pacienteId}`);
}

export async function crearTareaPaciente(pacienteId: string, formData: FormData) {
  const profesional = await getProfesional();
  await verificarPacienteDelTenant(pacienteId, profesional.id);
  await sql`
    insert into tareas_paciente (paciente_id, descripcion, origen)
    values (${pacienteId}, ${String(formData.get("descripcion") ?? "")}, 'manual')
  `;
  revalidatePath(`/panel/pacientes/${pacienteId}`);
}

/**
 * Crea el login de intranet del paciente (PRD M5): cuenta con rol
 * restringido, vinculada a la ficha. La clave la define el profesional
 * y la entrega al paciente (quien puede cambiarla después).
 */
export async function crearLoginPaciente(pacienteId: string, formData: FormData) {
  const profesional = await getProfesional();
  await verificarPacienteDelTenant(pacienteId, profesional.id);

  const email = String(formData.get("email") ?? "").toLowerCase().trim();
  const password = String(formData.get("password") ?? "");
  if (!email || password.length < 8) {
    throw new Error("Email y contraseña de al menos 8 caracteres son obligatorios");
  }

  const [paciente] = await sql<{ user_id: string | null }[]>`
    select user_id from pacientes where id = ${pacienteId}
  `;
  if (paciente.user_id) throw new Error("Este paciente ya tiene acceso a la intranet");

  const existente = await sql`select 1 from usuarios where email = ${email}`;
  if (existente.length) throw new Error("Ya existe una cuenta con ese email");

  const hash = await bcrypt.hash(password, 12);
  const [usuario] = await sql<{ id: string }[]>`
    insert into usuarios (email, password_hash, rol)
    values (${email}, ${hash}, 'paciente')
    returning id
  `;
  await sql`update pacientes set user_id = ${usuario.id}, email = ${email} where id = ${pacienteId}`;
  revalidatePath(`/panel/pacientes/${pacienteId}`);
}

/** Consentimiento de grabación vigente (último registro). */
export async function tieneConsentimientoGrabacion(
  pacienteId: string
): Promise<boolean> {
  const filas = await sql<{ aceptado: boolean }[]>`
    select aceptado from consentimientos
    where paciente_id = ${pacienteId} and tipo = 'grabacion'
    order by fecha desc limit 1
  `;
  return filas[0]?.aceptado === true;
}
