"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { sql } from "@/lib/db";
import {
  auditarIA,
  getPacienteActual,
  getProfesional,
  providerParaTarea,
  verificarAplicacionDelTenant,
  verificarPacienteDelTenant,
} from "./helpers";
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
  const profesional = await getProfesional();
  const pacienteId = String(formData.get("paciente_id"));
  await verificarPacienteDelTenant(pacienteId, profesional.id);
  const testCodigo = String(formData.get("test_codigo"));
  if (!getTest(testCodigo)) throw new Error("Test desconocido");

  await sql`
    insert into tests_aplicaciones (paciente_id, test_codigo, aplicado_via)
    values (
      ${pacienteId},
      ${testCodigo},
      ${String(formData.get("aplicado_via") ?? "vivo_supervisado")}
    )
  `;
  revalidatePath("/panel/tests");
  redirect("/panel/tests");
}

/**
 * Corrección automática compartida: valida completitud, calcula
 * puntaje, subescalas y severidad, y persiste las respuestas.
 */
async function corregirYGuardar(aplicacionId: string, formData: FormData) {
  const [aplicacion] = await sql<
    { id: string; test_codigo: string; estado: string }[]
  >`
    select id, test_codigo, estado from tests_aplicaciones
    where id = ${aplicacionId}
  `;
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
  await sql`
    update tests_aplicaciones set
      respuestas = ${sql.json(respuestas)},
      puntaje_total = ${resultado.puntajeTotal},
      subescalas = ${sql.json(JSON.parse(JSON.stringify(resultado.subescalas)))},
      severidad = ${resultado.severidad},
      estado = 'respondido',
      respondido_at = now()
    where id = ${aplicacionId}
  `;

  revalidatePath("/portal");
  revalidatePath("/panel/tests");
}

/** Envío de respuestas por el profesional (modo manual o en vivo). */
export async function responderTest(aplicacionId: string, formData: FormData) {
  const profesional = await getProfesional();
  await verificarAplicacionDelTenant(aplicacionId, profesional.id);
  await corregirYGuardar(aplicacionId, formData);
}

/** Envío de respuestas por el paciente desde su intranet. */
export async function responderTestComoPaciente(
  aplicacionId: string,
  formData: FormData
) {
  const paciente = await getPacienteActual();
  const propia = await sql`
    select 1 from tests_aplicaciones
    where id = ${aplicacionId} and paciente_id = ${paciente.id}
  `;
  if (!propia.length) throw new Error("Test no asignado a tu cuenta");
  await corregirYGuardar(aplicacionId, formData);
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
  const profesional = await getProfesional();
  await verificarAplicacionDelTenant(aplicacionId, profesional.id);
  await sql`
    update tests_aplicaciones set
      observaciones_profesional = ${String(formData.get("observaciones") ?? "")}
    where id = ${aplicacionId}
  `;
  revalidatePath(`/panel/tests/${aplicacionId}`);
}

/**
 * "Corregir con IA": respuestas + observaciones + conocimiento de
 * corrección → borrador de informe en la plantilla del profesional.
 */
export async function generarInformeTest(aplicacionId: string) {
  const profesional = await getProfesional();
  await verificarAplicacionDelTenant(aplicacionId, profesional.id);

  const [aplicacion] = await sql<
    {
      test_codigo: string;
      puntaje_total: number | null;
      severidad: string | null;
      subescalas: unknown;
      observaciones_profesional: string | null;
    }[]
  >`
    select test_codigo, puntaje_total, severidad, subescalas, observaciones_profesional
    from tests_aplicaciones where id = ${aplicacionId}
  `;
  if (!aplicacion) throw new Error("Aplicación no encontrada");
  if (!aplicacion.observaciones_profesional) {
    throw new Error(
      "Registra primero tus observaciones de la aplicación — es un paso obligatorio antes de generar el informe."
    );
  }
  const def = getTest(aplicacion.test_codigo);
  if (!def) throw new Error("Definición no encontrada");

  const plantillas = await sql<
    { estructura_json: unknown; membrete: string | null }[]
  >`
    select estructura_json, membrete from plantillas_informe
    where profesional_id = ${profesional.id} and tipo = 'test'
    limit 1
  `;

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
      plantilla: plantillas[0]
        ? JSON.stringify(plantillas[0].estructura_json)
        : undefined,
    }),
  });

  await sql`
    update tests_aplicaciones set
      interpretacion_borrador = ${respuesta.texto},
      estado = 'corregido'
    where id = ${aplicacionId}
  `;

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
  await verificarAplicacionDelTenant(aplicacionId, profesional.id);
  const instruccion = String(formData.get("instruccion") ?? "");

  const [aplicacion] = await sql<{ interpretacion_borrador: string | null }[]>`
    select interpretacion_borrador from tests_aplicaciones where id = ${aplicacionId}
  `;
  if (!aplicacion?.interpretacion_borrador) {
    throw new Error("No hay borrador que corregir");
  }

  const { provider, modelo } = providerParaTarea(profesional, "informe_test");
  const respuesta = await provider.generar({
    sistema: SISTEMA_INFORME_TEST,
    usuario: promptCorreccion(aplicacion.interpretacion_borrador, instruccion),
  });

  await sql`
    update tests_aplicaciones set interpretacion_borrador = ${respuesta.texto}
    where id = ${aplicacionId}
  `;

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
  await verificarAplicacionDelTenant(aplicacionId, profesional.id);
  const texto = String(formData.get("interpretacion") ?? "");
  const conPie =
    texto + PIE_LEGAL_INFORME(profesional.nombre, profesional.n_registro ?? "");

  await sql`
    update tests_aplicaciones set
      interpretacion_aprobada = ${conPie},
      estado = 'aprobado',
      aprobado_at = now()
    where id = ${aplicacionId}
  `;

  await auditarIA({
    profesionalId: profesional.id,
    recurso: `test_aplicacion:${aplicacionId}`,
    modelo: "revision_humana",
    accion: "aprobado",
  });
  revalidatePath(`/panel/tests/${aplicacionId}`);
}
