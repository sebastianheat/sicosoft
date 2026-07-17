"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { getProfesional } from "./helpers";

export async function crearCita(formData: FormData) {
  await getProfesional();
  const supabase = await supabaseServer();

  const fecha = String(formData.get("fecha"));
  const hora = String(formData.get("hora"));
  const { error } = await supabase.from("citas").insert({
    paciente_id: String(formData.get("paciente_id")),
    fecha: new Date(`${fecha}T${hora}:00`).toISOString(),
    duracion_min: Number(formData.get("duracion_min") ?? 50),
    tipo: String(formData.get("tipo") ?? "online"),
    valor: Number(formData.get("valor") ?? 0),
    // gcal_event_id y meet_link se completan con la integración
    // de Google Calendar (crea el evento y su sala de Meet).
    meet_link: String(formData.get("meet_link") ?? "") || null,
  });
  if (error) {
    redirect(`/panel/agenda?error=${encodeURIComponent(error.message)}`);
  }
  revalidatePath("/panel/agenda");
  redirect("/panel/agenda");
}

export async function cambiarEstadoCita(citaId: string, estado: string) {
  await getProfesional();
  const supabase = await supabaseServer();
  const { error } = await supabase
    .from("citas")
    .update({ estado })
    .eq("id", citaId);
  if (error) throw new Error(error.message);

  // Una cita realizada con valor genera automáticamente su cobro pendiente
  if (estado === "realizada") {
    const { data: cita } = await supabase
      .from("citas")
      .select("id, valor")
      .eq("id", citaId)
      .single();
    if (cita && cita.valor > 0) {
      const { data: pagoExistente } = await supabase
        .from("pagos")
        .select("id")
        .eq("cita_id", citaId)
        .limit(1);
      if (!pagoExistente?.length) {
        await supabase.from("pagos").insert({
          cita_id: citaId,
          monto: cita.valor,
          estado: "pendiente",
        });
      }
    }
  }
  revalidatePath("/panel/agenda");
  revalidatePath("/panel/finanzas");
}
