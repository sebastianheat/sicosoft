"use server";

import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { getPacienteActual } from "./helpers";

/** Check-in de ánimo (PRD M5): formulario simple, nunca un chatbot. */
export async function registrarCheckin(formData: FormData) {
  const paciente = await getPacienteActual();
  await sql`
    insert into checkins_animo (paciente_id, fecha, valor, nota)
    values (
      ${paciente.id},
      current_date,
      ${Number(formData.get("valor"))},
      ${String(formData.get("nota") ?? "") || null}
    )
    on conflict (paciente_id, fecha)
    do update set valor = excluded.valor, nota = excluded.nota
  `;
  revalidatePath("/portal");
}

export async function marcarTarea(tareaId: string, cumplida: boolean) {
  const paciente = await getPacienteActual();
  await sql`
    update tareas_paciente set
      estado = ${cumplida ? "cumplida" : "pendiente"},
      cumplida_at = ${cumplida ? new Date().toISOString() : null}
    where id = ${tareaId} and paciente_id = ${paciente.id}
  `;
  revalidatePath("/portal");
}
