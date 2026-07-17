"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { sql } from "@/lib/db";
import { cerrarSesion, crearSesion } from "@/lib/auth/session";

export async function login(formData: FormData) {
  const email = String(formData.get("email") ?? "").toLowerCase().trim();
  const password = String(formData.get("password") ?? "");

  const usuarios = await sql<
    { id: string; password_hash: string; rol: "profesional" | "paciente" }[]
  >`select id, password_hash, rol from usuarios where email = ${email}`;

  if (!usuarios.length || !(await bcrypt.compare(password, usuarios[0].password_hash))) {
    redirect(`/login?error=${encodeURIComponent("Credenciales inválidas")}`);
  }

  const usuario = usuarios[0];
  const nombre =
    usuario.rol === "profesional"
      ? (await sql`select nombre from profesionales where user_id = ${usuario.id}`)[0]
          ?.nombre
      : (await sql`select nombre from pacientes where user_id = ${usuario.id}`)[0]
          ?.nombre;

  await crearSesion({ userId: usuario.id, rol: usuario.rol, nombre: nombre ?? "" });
  revalidatePath("/", "layout");
  redirect(usuario.rol === "paciente" ? "/portal" : "/panel");
}

export async function registrarProfesional(formData: FormData) {
  const email = String(formData.get("email") ?? "").toLowerCase().trim();
  const password = String(formData.get("password") ?? "");
  const nombre = String(formData.get("nombre") ?? "").trim();
  const nRegistro = String(formData.get("n_registro") ?? "").trim();

  if (password.length < 8) {
    redirect(`/registro?error=${encodeURIComponent("La contraseña debe tener al menos 8 caracteres")}`);
  }

  const existente = await sql`select 1 from usuarios where email = ${email}`;
  if (existente.length) {
    redirect(`/registro?error=${encodeURIComponent("Ya existe una cuenta con ese email")}`);
  }

  const hash = await bcrypt.hash(password, 12);
  const [usuario] = await sql<{ id: string }[]>`
    insert into usuarios (email, password_hash, rol)
    values (${email}, ${hash}, 'profesional')
    returning id
  `;
  await sql`
    insert into profesionales (user_id, nombre, n_registro)
    values (${usuario.id}, ${nombre}, ${nRegistro || null})
  `;

  await crearSesion({ userId: usuario.id, rol: "profesional", nombre });
  revalidatePath("/", "layout");
  redirect("/panel");
}

export async function logout() {
  await cerrarSesion();
  revalidatePath("/", "layout");
  redirect("/login");
}
