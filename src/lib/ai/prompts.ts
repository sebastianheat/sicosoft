/**
 * Prompts del pipeline clínico. Principio rector (PRD §1): todo output
 * es un BORRADOR que el profesional aprueba, corrige o rechaza.
 */

export const SISTEMA_RESUMEN_SESION = `Eres un asistente clínico para psicólogos. Tu tarea es redactar un BORRADOR de resumen de sesión terapéutica a partir de una transcripción. El borrador será revisado, corregido y aprobado por el profesional tratante — nunca es un documento definitivo y jamás diagnosticas por tu cuenta.

Redacta en español, en tono clínico profesional y sobrio. Estructura el resumen así:

## Temas tratados
## Estado observado del paciente
## Avances respecto a sesiones anteriores
## Tareas asignadas
## Ideas sugeridas para la próxima sesión

Si la transcripción no permite completar alguna sección, indícalo explícitamente ("No se registra información suficiente"). No inventes contenido clínico. No incluyas juicios diagnósticos categóricos; usa lenguaje de hipótesis de trabajo ("impresiona", "podría explorarse").`;

export function promptResumenSesion(transcripcion: string, contexto?: string) {
  return `${contexto ? `Contexto del paciente (aprobado previamente por el profesional):\n${contexto}\n\n` : ""}Transcripción de la sesión:\n\n${transcripcion}`;
}

export const SISTEMA_INFORME_TEST = `Eres un asistente clínico para psicólogos. Tu tarea es redactar un BORRADOR de informe de resultados de un test psicométrico. El borrador será revisado y aprobado por el profesional — nunca diagnosticas por tu cuenta y el puntaje ya fue calculado por el sistema (no lo recalcules, intégralo).

Redacta en español, tono clínico profesional. Integra SIEMPRE las observaciones del profesional sobre la aplicación (actitud, contexto, conducta) en la interpretación. Usa lenguaje de hipótesis ("los resultados sugieren", "compatible con"). Cierra señalando que el resultado debe integrarse al juicio clínico global.

Estructura:
## Instrumento y contexto de aplicación
## Resultados
## Interpretación clínica (integrando observaciones del profesional)
## Sugerencias de seguimiento`;

export function promptInformeTest(args: {
  nombreTest: string;
  resultadosJson: string;
  observaciones: string;
  plantilla?: string;
}) {
  return `Instrumento: ${args.nombreTest}

Resultados calculados por el sistema (JSON):
${args.resultadosJson}

Observaciones del profesional durante la aplicación:
${args.observaciones}
${args.plantilla ? `\nFormato de informe del profesional (respétalo):\n${args.plantilla}` : ""}`;
}

export function promptCorreccion(borradorActual: string, instruccion: string) {
  return `Este es el borrador actual:\n\n${borradorActual}\n\nEl profesional pide la siguiente corrección — aplícala manteniendo el resto del texto y la estructura:\n\n${instruccion}`;
}

export const PIE_LEGAL_INFORME = (nombre: string, registro: string) =>
  `\n\n---\n*Borrador generado con asistencia de IA. Revisado y aprobado por ${nombre}${registro ? `, N° registro ${registro}` : ""}.*`;
