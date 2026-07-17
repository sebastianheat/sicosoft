import type { TestDefinition } from "../types";

const FRECUENCIA_BASE = [
  { valor: 0, etiqueta: "Nunca" },
  { valor: 1, etiqueta: "Una vez al mes o menos" },
  { valor: 2, etiqueta: "2 a 4 veces al mes" },
  { valor: 3, etiqueta: "2 a 3 veces a la semana" },
  { valor: 4, etiqueta: "4 o más veces a la semana" },
];

const FRECUENCIA_SINTOMA = [
  { valor: 0, etiqueta: "Nunca" },
  { valor: 1, etiqueta: "Menos de una vez al mes" },
  { valor: 2, etiqueta: "Mensualmente" },
  { valor: 3, etiqueta: "Semanalmente" },
  { valor: 4, etiqueta: "A diario o casi a diario" },
];

const TRES_NIVELES = [
  { valor: 0, etiqueta: "No" },
  { valor: 2, etiqueta: "Sí, pero no en el último año" },
  { valor: 4, etiqueta: "Sí, durante el último año" },
];

export const AUDIT: TestDefinition = {
  codigo: "AUDIT",
  nombre: "Test de Identificación de Trastornos por Consumo de Alcohol (OMS)",
  nombreCorto: "AUDIT",
  tipo: "libre",
  descripcion: "Screening de consumo de riesgo de alcohol (10 ítems, OMS).",
  instrucciones:
    "Las siguientes preguntas se refieren a su consumo de bebidas alcohólicas durante el último año. Una \"bebida\" equivale a una unidad estándar.",
  marcoTemporal: "Último año",
  items: [
    { id: "au1", texto: "¿Con qué frecuencia consume alguna bebida alcohólica?", opciones: FRECUENCIA_BASE },
    {
      id: "au2",
      texto: "¿Cuántas bebidas alcohólicas suele consumir en un día de consumo normal?",
      opciones: [
        { valor: 0, etiqueta: "1 o 2" },
        { valor: 1, etiqueta: "3 o 4" },
        { valor: 2, etiqueta: "5 o 6" },
        { valor: 3, etiqueta: "7 a 9" },
        { valor: 4, etiqueta: "10 o más" },
      ],
    },
    { id: "au3", texto: "¿Con qué frecuencia toma 6 o más bebidas alcohólicas en una sola ocasión?", opciones: FRECUENCIA_SINTOMA },
    { id: "au4", texto: "¿Con qué frecuencia en el último año ha sido incapaz de parar de beber una vez que había empezado?", opciones: FRECUENCIA_SINTOMA },
    { id: "au5", texto: "¿Con qué frecuencia en el último año no pudo hacer lo que se esperaba de usted porque había bebido?", opciones: FRECUENCIA_SINTOMA },
    { id: "au6", texto: "¿Con qué frecuencia en el último año ha necesitado beber en ayunas para recuperarse después de haber bebido mucho el día anterior?", opciones: FRECUENCIA_SINTOMA },
    { id: "au7", texto: "¿Con qué frecuencia en el último año ha tenido remordimientos o sentimientos de culpa después de haber bebido?", opciones: FRECUENCIA_SINTOMA },
    { id: "au8", texto: "¿Con qué frecuencia en el último año no ha podido recordar lo que sucedió la noche anterior porque había estado bebiendo?", opciones: FRECUENCIA_SINTOMA },
    { id: "au9", texto: "¿Usted o alguna otra persona ha resultado herido/a porque usted había bebido?", opciones: TRES_NIVELES },
    { id: "au10", texto: "¿Algún familiar, amigo, médico o profesional de la salud ha mostrado preocupación por su consumo de alcohol o le ha sugerido que deje de beber?", opciones: TRES_NIVELES },
  ],
  rangos: [
    { min: 0, max: 7, etiqueta: "Consumo de bajo riesgo", nivel: "success" },
    { min: 8, max: 15, etiqueta: "Consumo de riesgo", nivel: "warning" },
    { min: 16, max: 19, etiqueta: "Consumo perjudicial", nivel: "warning" },
    { min: 20, max: 40, etiqueta: "Posible dependencia", nivel: "danger" },
  ],
  fuente: "Babor et al., OMS (2001). Instrumento de libre uso de la OMS.",
};
