"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";
import { getProfesional } from "./helpers";

export async function registrarPago(pagoId: string, formData: FormData) {
  await getProfesional();
  const supabase = await supabaseServer();
  const { error } = await supabase
    .from("pagos")
    .update({
      estado: String(formData.get("estado") ?? "pagado"),
      metodo: String(formData.get("metodo") ?? "transferencia"),
      pagado_at: new Date().toISOString(),
    })
    .eq("id", pagoId);
  if (error) throw new Error(error.message);
  revalidatePath("/panel/finanzas");
}

export async function crearCobroManual(formData: FormData) {
  await getProfesional();
  const supabase = await supabaseServer();
  const { error } = await supabase.from("pagos").insert({
    cita_id: String(formData.get("cita_id")),
    monto: Number(formData.get("monto") ?? 0),
    estado: "pendiente",
  });
  if (error) throw new Error(error.message);
  revalidatePath("/panel/finanzas");
}
