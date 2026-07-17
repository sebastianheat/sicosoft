import type { TestDefinition } from "../types";

const OPCIONES = [
  { valor: 0, etiqueta: "Nunca" },
  { valor: 1, etiqueta: "Varios días" },
  { valor: 2, etiqueta: "Más de la mitad de los días" },
  { valor: 3, etiqueta: "Casi todos los días" },
];

export const GAD7: TestDefinition = {
  codigo: "GAD7",
  nombre: "Escala de Ansiedad Generalizada — 7",
  nombreCorto: "GAD-7",
  tipo: "libre",
  descripcion: "Screening de sintomatología ansiosa (7 ítems).",
  instrucciones:
    "Durante las últimas 2 semanas, ¿con qué frecuencia le han molestado los siguientes problemas?",
  marcoTemporal: "Últimas 2 semanas",
  items: [
    { id: "gad1", texto: "Se ha sentido nervioso/a, ansioso/a o con los nervios de punta", opciones: OPCIONES },
    { id: "gad2", texto: "No ha podido dejar de preocuparse o controlar la preocupación", opciones: OPCIONES },
    { id: "gad3", texto: "Se ha preocupado demasiado por diferentes cosas", opciones: OPCIONES },
    { id: "gad4", texto: "Ha tenido dificultad para relajarse", opciones: OPCIONES },
    { id: "gad5", texto: "Se ha sentido tan inquieto/a que le cuesta quedarse quieto/a", opciones: OPCIONES },
    { id: "gad6", texto: "Se ha irritado o enfadado con facilidad", opciones: OPCIONES },
    { id: "gad7", texto: "Ha sentido miedo, como si algo terrible fuera a pasar", opciones: OPCIONES },
  ],
  rangos: [
    { min: 0, max: 4, etiqueta: "Ansiedad mínima", nivel: "success" },
    { min: 5, max: 9, etiqueta: "Ansiedad leve", nivel: "success" },
    { min: 10, max: 14, etiqueta: "Ansiedad moderada", nivel: "warning" },
    { min: 15, max: 21, etiqueta: "Ansiedad severa", nivel: "danger" },
  ],
  fuente: "Spitzer, Kroenke, Williams & Löwe (2006). Instrumento de libre uso.",
};
