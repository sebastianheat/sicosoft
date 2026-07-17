"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { sql } from "@/lib/db";
import {
  getProfesional,
  verificarCitaDelTenant,
  verificarPacienteDelTenant,
} from "./helpers";

export async function crearCita(formData: FormData) {
  const profesional = await getProfesional();
  const pacienteId = String(formData.get("paciente_id"));
  await verificarPacienteDelTenant(pacienteId, profesional.id);

  const fecha = String(formData.get("fecha"));
  const hora = String(formData.get("hora"));
  await sql`
    insert into citas (paciente_id, fecha, duracion_min, tipo, valor, meet_link)
    values (
      ${pacienteId},
      ${new Date(`${fecha}T${hora}:00`).toISOString()},
      ${Number(formData.get("duracion_min") ?? 50)},
      ${String(formData.get("tipo") ?? "online")},
      ${Number(formData.get("valor") ?? 0)},
      ${String(formData.get("meet_link") ?? "") || null}
    )
  `;
  revalidatePath("/panel/agenda");
  redirect("/panel/agenda");
}

export async function cambiarEstadoCita(citaId: string, estado: string) {
  const profesional = await getProfesional();
  await verificarCitaDelTenant(citaId, profesional.id);
  await sql`update citas set estado = ${estado} where id = ${citaId}`;

  // Una cita realizada con valor genera automáticamente su cobro pendiente
  if (estado === "realizada") {
    const [cita] = await sql<{ id: string; valor: number }[]>`
      select id, valor from citas where id = ${citaId}
    `;
    if (cita && cita.valor > 0) {
      const pagoExistente = await sql`select 1 from pagos where cita_id = ${citaId} limit 1`;
      if (!pagoExistente.length) {
        await sql`
          insert into pagos (cita_id, monto, estado)
          values (${citaId}, ${cita.valor}, 'pendiente')
        `;
      }
    }
  }
  revalidatePath("/panel/agenda");
  revalidatePath("/panel/finanzas");
}
