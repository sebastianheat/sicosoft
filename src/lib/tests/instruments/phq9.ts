import type { TestDefinition } from "../types";

const OPCIONES = [
  { valor: 0, etiqueta: "Nunca" },
  { valor: 1, etiqueta: "Varios días" },
  { valor: 2, etiqueta: "Más de la mitad de los días" },
  { valor: 3, etiqueta: "Casi todos los días" },
];

export const PHQ9: TestDefinition = {
  codigo: "PHQ9",
  nombre: "Cuestionario de Salud del Paciente — 9",
  nombreCorto: "PHQ-9",
  tipo: "libre",
  descripcion: "Screening de sintomatología depresiva (9 ítems).",
  instrucciones:
    "Durante las últimas 2 semanas, ¿con qué frecuencia le han molestado los siguientes problemas?",
  marcoTemporal: "Últimas 2 semanas",
  items: [
    { id: "phq1", texto: "Poco interés o placer en hacer cosas", opciones: OPCIONES },
    { id: "phq2", texto: "Se ha sentido decaído/a, deprimido/a o sin esperanzas", opciones: OPCIONES },
    { id: "phq3", texto: "Dificultad para quedarse o permanecer dormido/a, o ha dormido demasiado", opciones: OPCIONES },
    { id: "phq4", texto: "Se ha sentido cansado/a o con poca energía", opciones: OPCIONES },
    { id: "phq5", texto: "Sin apetito o ha comido en exceso", opciones: OPCIONES },
    { id: "phq6", texto: "Se ha sentido mal con usted mismo/a — o que es un fracaso o que ha quedado mal con usted mismo/a o con su familia", opciones: OPCIONES },
    { id: "phq7", texto: "Dificultad para concentrarse en cosas como leer el diario o ver televisión", opciones: OPCIONES },
    { id: "phq8", texto: "¿Se ha estado moviendo o hablando tan lento que otras personas podrían notarlo? O lo contrario: tan inquieto/a o agitado/a que se ha estado moviendo mucho más de lo normal", opciones: OPCIONES },
    { id: "phq9", texto: "Pensamientos de que estaría mejor muerto/a o de lastimarse de alguna manera", opciones: OPCIONES, alertaRiesgo: true },
  ],
  rangos: [
    { min: 0, max: 4, etiqueta: "Depresión mínima o ausente", nivel: "success" },
    { min: 5, max: 9, etiqueta: "Depresión leve", nivel: "success" },
    { min: 10, max: 14, etiqueta: "Depresión moderada", nivel: "warning" },
    { min: 15, max: 19, etiqueta: "Depresión moderadamente severa", nivel: "warning" },
    { min: 20, max: 27, etiqueta: "Depresión severa", nivel: "danger" },
  ],
  fuente:
    "Kroenke, Spitzer & Williams (2001). Instrumento de libre uso (Pfizer liberó los derechos).",
};
