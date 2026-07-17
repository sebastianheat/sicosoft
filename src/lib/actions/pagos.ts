"use server";

import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { getProfesional, verificarCitaDelTenant } from "./helpers";

export async function registrarPago(pagoId: string, formData: FormData) {
  const profesional = await getProfesional();
  const [pago] = await sql<{ cita_id: string }[]>`
    select cita_id from pagos where id = ${pagoId}
  `;
  if (!pago) throw new Error("Pago no encontrado");
  await verificarCitaDelTenant(pago.cita_id, profesional.id);

  await sql`
    update pagos set
      estado = ${String(formData.get("estado") ?? "pagado")},
      metodo = ${String(formData.get("metodo") ?? "transferencia")},
      pagado_at = now()
    where id = ${pagoId}
  `;
  revalidatePath("/panel/finanzas");
}

export async function crearCobroManual(formData: FormData) {
  const profesional = await getProfesional();
  const citaId = String(formData.get("cita_id"));
  await verificarCitaDelTenant(citaId, profesional.id);
  await sql`
    insert into pagos (cita_id, monto, estado)
    values (${citaId}, ${Number(formData.get("monto") ?? 0)}, 'pendiente')
  `;
  revalidatePath("/panel/finanzas");
}
