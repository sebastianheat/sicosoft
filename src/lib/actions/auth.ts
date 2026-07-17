"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";

export async function login(formData: FormData) {
  const supabase = await supabaseServer();
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) {
    redirect(`/login?error=${encodeURIComponent("Credenciales inválidas")}`);
  }
  revalidatePath("/", "layout");
  const rol = (data.user?.user_metadata?.rol as string) ?? "profesional";
  redirect(rol === "paciente" ? "/portal" : "/panel");
}

export async function registrarProfesional(formData: FormData) {
  const supabase = await supabaseServer();
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const nombre = String(formData.get("nombre") ?? "");
  const nRegistro = String(formData.get("n_registro") ?? "");

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { rol: "profesional", nombre } },
  });
  if (error || !data.user) {
    redirect(
      `/registro?error=${encodeURIComponent(error?.message ?? "Error al registrar")}`
    );
  }

  const { error: perfilError } = await supabase.from("profesionales").insert({
    user_id: data.user.id,
    nombre,
    n_registro: nRegistro || null,
  });
  if (perfilError) {
    redirect(
      `/registro?error=${encodeURIComponent("Cuenta creada pero falló el perfil: " + perfilError.message)}`
    );
  }
  revalidatePath("/", "layout");
  redirect("/panel");
}

export async function logout() {
  const supabase = await supabaseServer();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
