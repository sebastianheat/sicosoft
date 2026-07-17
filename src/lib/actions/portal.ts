"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";
import { getPacienteActual } from "./helpers";

/** Check-in de ánimo (PRD M5): formulario simple, nunca un chatbot. */
export async function registrarCheckin(formData: FormData) {
  const paciente = await getPacienteActual();
  const supabase = await supabaseServer();
  const { error } = await supabase.from("checkins_animo").upsert(
    {
      paciente_id: paciente.id,
      fecha: new Date().toISOString().slice(0, 10),
      valor: Number(formData.get("valor")),
      nota: String(formData.get("nota") ?? "") || null,
    },
    { onConflict: "paciente_id,fecha" }
  );
  if (error) throw new Error(error.message);
  revalidatePath("/portal");
}

export async function marcarTarea(tareaId: string, cumplida: boolean) {
  await getPacienteActual();
  const supabase = await supabaseServer();
  const { error } = await supabase
    .from("tareas_paciente")
    .update({
      estado: cumplida ? "cumplida" : "pendiente",
      cumplida_at: cumplida ? new Date().toISOString() : null,
    })
    .eq("id", tareaId);
  if (error) throw new Error(error.message);
  revalidatePath("/portal");
}
