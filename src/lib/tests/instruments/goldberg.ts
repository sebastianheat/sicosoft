import type { TestDefinition } from "../types";

const SI_NO = [
  { valor: 1, etiqueta: "Sí" },
  { valor: 0, etiqueta: "No" },
];

/**
 * Escala de Ansiedad y Depresión de Goldberg (EADG).
 * Dos subescalas de 9 ítems. Puntos de corte: ansiedad ≥ 4, depresión ≥ 2.
 */
export const GOLDBERG: TestDefinition = {
  codigo: "GOLDBERG",
  nombre: "Escala de Ansiedad y Depresión de Goldberg (EADG)",
  nombreCorto: "Goldberg",
  tipo: "libre",
  descripcion: "Screening breve de ansiedad y depresión (18 ítems Sí/No).",
  instrucciones:
    "Responda Sí o No según cómo se ha sentido en las últimas 2 semanas.",
  marcoTemporal: "Últimas 2 semanas",
  items: [
    { id: "ga1", texto: "¿Se ha sentido muy excitado/a, nervioso/a o en tensión?", opciones: SI_NO, subescala: "ansiedad" },
    { id: "ga2", texto: "¿Ha estado muy preocupado/a por algo?", opciones: SI_NO, subescala: "ansiedad" },
    { id: "ga3", texto: "¿Se ha sentido muy irritable?", opciones: SI_NO, subescala: "ansiedad" },
    { id: "ga4", texto: "¿Ha tenido dificultad para relajarse?", opciones: SI_NO, subescala: "ansiedad" },
    { id: "ga5", texto: "¿Ha dormido mal, ha tenido dificultades para dormir?", opciones: SI_NO, subescala: "ansiedad" },
    { id: "ga6", texto: "¿Ha tenido dolores de cabeza o de nuca?", opciones: SI_NO, subescala: "ansiedad" },
    { id: "ga7", texto: "¿Ha tenido alguno de los siguientes síntomas: temblores, hormigueos, mareos, sudores, diarrea?", opciones: SI_NO, subescala: "ansiedad" },
    { id: "ga8", texto: "¿Ha estado preocupado/a por su salud?", opciones: SI_NO, subescala: "ansiedad" },
    { id: "ga9", texto: "¿Ha tenido alguna dificultad para conciliar el sueño, para quedarse dormido/a?", opciones: SI_NO, subescala: "ansiedad" },
    { id: "gd1", texto: "¿Se ha sentido con poca energía?", opciones: SI_NO, subescala: "depresion" },
    { id: "gd2", texto: "¿Ha perdido usted el interés por las cosas?", opciones: SI_NO, subescala: "depresion" },
    { id: "gd3", texto: "¿Ha perdido la confianza en sí mismo/a?", opciones: SI_NO, subescala: "depresion" },
    { id: "gd4", texto: "¿Se ha sentido usted desesperanzado/a, sin esperanzas?", opciones: SI_NO, subescala: "depresion", alertaRiesgo: true },
    { id: "gd5", texto: "¿Ha tenido dificultades para concentrarse?", opciones: SI_NO, subescala: "depresion" },
    { id: "gd6", texto: "¿Ha perdido peso? (a causa de su falta de apetito)", opciones: SI_NO, subescala: "depresion" },
    { id: "gd7", texto: "¿Se ha estado despertando demasiado temprano?", opciones: SI_NO, subescala: "depresion" },
    { id: "gd8", texto: "¿Se ha sentido usted enlentecido/a?", opciones: SI_NO, subescala: "depresion" },
    { id: "gd9", texto: "¿Cree usted que ha tenido tendencia a encontrarse peor por las mañanas?", opciones: SI_NO, subescala: "depresion" },
  ],
  rangos: [],
  subescalas: [
    {
      codigo: "ansiedad",
      nombre: "Ansiedad",
      puntoCorte: 4,
      rangos: [
        { min: 0, max: 3, etiqueta: "Bajo punto de corte", nivel: "success" },
        { min: 4, max: 9, etiqueta: "Sobre punto de corte (≥4): probable trastorno ansioso", nivel: "warning" },
      ],
    },
    {
      codigo: "depresion",
      nombre: "Depresión",
      puntoCorte: 2,
      rangos: [
        { min: 0, max: 1, etiqueta: "Bajo punto de corte", nivel: "success" },
        { min: 2, max: 9, etiqueta: "Sobre punto de corte (≥2): probable trastorno depresivo", nivel: "warning" },
      ],
    },
  ],
  fuente: "Goldberg et al. (1988), validación española Montón et al. (1993). Libre uso.",
};
