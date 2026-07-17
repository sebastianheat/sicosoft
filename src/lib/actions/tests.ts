"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { auditarIA, getProfesional, getPacienteActual, providerParaTarea } from "./helpers";
import { corregirTest, getTest, itemsPendientes } from "@/lib/tests";
import {
  PIE_LEGAL_INFORME,
  promptCorreccion,
  promptInformeTest,
  SISTEMA_INFORME_TEST,
} from "@/lib/ai";

/**
 * Asignar un test (PRD M2): modo vivo supervisado (por defecto)
 * o pre-sesión si el profesional lo habilita.
 */
export async function asignarTest(formData: FormData) {
  await getProfesional();
  const supabase = await supabaseServer();
  const testCodigo = String(formData.get("test_codigo"));
  if (!getTest(testCodigo)) throw new Error("Test desconocido");

  const { error } = await supabase.from("tests_aplicaciones").insert({
    paciente_id: String(formData.get("paciente_id")),
    test_codigo: testCodigo,
    aplicado_via: String(formData.get("aplicado_via") ?? "vivo_supervisado"),
  });
  if (error) throw new Error(error.message);
  revalidatePath("/panel/tests");
  redirect("/panel/tests");
}

/**
 * Envío de respuestas (paciente en su intranet, o profesional en modo manual).
 * Corrección automática inmediata: puntaje, severidad y subescalas.
 */
export async function responderTest(aplicacionId: string, formData: FormData) {
  const supabase = await supabaseServer();

  const { data: aplicacion } = await supabase
    .from("tests_aplicaciones")
    .select("id, test_codigo, paciente_id, estado")
    .eq("id", aplicacionId)
    .single();
  if (!aplicacion) throw new Error("Aplicación no encontrada");
  if (!["pendiente", "en_curso"].includes(aplicacion.estado)) {
    throw new Error("Este test ya fue respondido");
  }

  const def = getTest(aplicacion.test_codigo);
  if (!def) throw new Error("Definición de test no encontrada");

  const respuestas: Record<string, number> = {};
  for (const item of def.items) {
    const v = formData.get(item.id);
    if (v !== null && v !== "") respuestas[item.id] = Number(v);
  }
  const pendientes = itemsPendientes(def, respuestas);
  if (pendientes.length > 0) {
    throw new Error(`Faltan ${pendientes.length} preguntas por responder`);
  }

  const resultado = corregirTest(def, respuestas);
  const { error } = await supabase
    .from("tests_aplicaciones")
    .update({
      respuestas,
      puntaje_total: resultado.puntajeTotal,
      subescalas: resultado.subescalas,
      severidad: resultado.severidad,
      estado: "respondido",
      respondido_at: new Date().toISOString(),
    })
    .eq("id", aplicacionId);
  if (error) throw new Error(error.message);

  revalidatePath("/portal");
  revalidatePath("/panel/tests");
}

/** Wrapper para el portal del paciente (valida pertenencia vía RLS). */
export async function responderTestComoPaciente(
  aplicacionId: string,
  formData: FormData
) {
  await getPacienteActual();
  await responderTest(aplicacionId, formData);
  redirect("/portal?test=respondido");
}

/**
 * Observaciones del profesional — paso obligatorio antes del informe
 * (PRD M2/M3): actitud, contexto y conducta durante la aplicación.
 */
export async function guardarObservaciones(
  aplicacionId: string,
  formData: FormData
) {
  await getProfesional();
  const supabase = await supabaseServer();
  const { error } = await supabase
    .from("tests_aplicaciones")
    .update({
      observaciones_profesional: String(formData.get("observaciones") ?? ""),
    })
    .eq("id", aplicacionId);
  if (error) throw new Error(error.message);
  revalidatePath(`/panel/tests/${aplicacionId}`);
}

/**
 * "Corregir con IA": respuestas + observaciones + conocimiento de
 * corrección → borrador de informe en la plantilla del profesional.
 */
export async function generarInformeTest(aplicacionId: string) {
  const profesional = await getProfesional();
  const supabase = await supabaseServer();

  const { data: aplicacion } = await supabase
    .from("tests_aplicaciones")
    .select("*")
    .eq("id", aplicacionId)
    .single();
  if (!aplicacion) throw new Error("Aplicación no encontrada");
  if (!aplicacion.observaciones_profesional) {
    throw new Error(
      "Registra primero tus observaciones de la aplicación — es un paso obligatorio antes de generar el informe."
    );
  }
  const def = getTest(aplicacion.test_codigo);
  if (!def) throw new Error("Definición no encontrada");

  const { data: plantillas } = await supabase
    .from("plantillas_informe")
    .select("estructura_json, membrete")
    .eq("profesional_id", profesional.id)
    .eq("tipo", "test")
    .limit(1);

  const { provider, modelo } = providerParaTarea(profesional, "informe_test");
  const respuesta = await provider.generar({
    sistema: SISTEMA_INFORME_TEST,
    usuario: promptInformeTest({
      nombreTest: def.nombre,
      resultadosJson: JSON.stringify(
        {
          puntaje_total: aplicacion.puntaje_total,
          severidad: aplicacion.severidad,
          subescalas: aplicacion.subescalas,
          rangos_instrumento: def.rangos,
        },
        null,
        2
      ),
      observaciones: aplicacion.observaciones_profesional,
      plantilla: plantillas?.[0]
        ? JSON.stringify(plantillas[0].estructura_json)
        : undefined,
    }),
  });

  const { error } = await supabase
    .from("tests_aplicaciones")
    .update({
      interpretacion_borrador: respuesta.texto,
      estado: "corregido",
    })
    .eq("id", aplicacionId);
  if (error) throw new Error(error.message);

  await auditarIA({
    profesionalId: profesional.id,
    recurso: `test_aplicacion:${aplicacionId}`,
    modelo,
    accion: "generado",
    tokensInput: respuesta.tokensInput,
    tokensOutput: respuesta.tokensOutput,
  });
  revalidatePath(`/panel/tests/${aplicacionId}`);
}

export async function corregirInformeConPrompt(
  aplicacionId: string,
  formData: FormData
) {
  const profesional = await getProfesional();
  const supabase = await supabaseServer();
  const instruccion = String(formData.get("instruccion") ?? "");

  const { data: aplicacion } = await supabase
    .from("tests_aplicaciones")
    .select("interpretacion_borrador")
    .eq("id", aplicacionId)
    .single();
  if (!aplicacion?.interpretacion_borrador) {
    throw new Error("No hay borrador que corregir");
  }

  const { provider, modelo } = providerParaTarea(profesional, "informe_test");
  const respuesta = await provider.generar({
    sistema: SISTEMA_INFORME_TEST,
    usuario: promptCorreccion(aplicacion.interpretacion_borrador, instruccion),
  });

  await supabase
    .from("tests_aplicaciones")
    .update({ interpretacion_borrador: respuesta.texto })
    .eq("id", aplicacionId);

  await auditarIA({
    profesionalId: profesional.id,
    recurso: `test_aplicacion:${aplicacionId}`,
    modelo,
    accion: "corregido",
    tokensInput: respuesta.tokensInput,
    tokensOutput: respuesta.tokensOutput,
  });
  revalidatePath(`/panel/tests/${aplicacionId}`);
}

/** Solo lo aprobado ingresa al timeline. Incluye pie legal (PRD M3). */
export async function aprobarInforme(aplicacionId: string, formData: FormData) {
  const profesional = await getProfesional();
  const supabase = await supabaseServer();
  const texto = String(formData.get("interpretacion") ?? "");
  const conPie =
    texto +
    PIE_LEGAL_INFORME(profesional.nombre, profesional.n_registro ?? "");

  const { error } = await supabase
    .from("tests_aplicaciones")
    .update({
      interpretacion_aprobada: conPie,
      estado: "aprobado",
      aprobado_at: new Date().toISOString(),
    })
    .eq("id", aplicacionId);
  if (error) throw new Error(error.message);

  await auditarIA({
    profesionalId: profesional.id,
    recurso: `test_aplicacion:${aplicacionId}`,
    modelo: "revision_humana",
    accion: "aprobado",
  });
  revalidatePath(`/panel/tests/${aplicacionId}`);
}
