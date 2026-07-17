import type { ItemTest, SubescalaDef, TestDefinition } from "../types";

/**
 * ASSIST v3.0 (OMS) — Prueba de detección de consumo de alcohol,
 * tabaco y sustancias. Genera las preguntas 1 a 7 por cada sustancia;
 * las preguntas 2-7 solo se muestran si Q1 (consumo alguna vez) es Sí.
 * Puntaje de involucramiento por sustancia = Q2+Q3+Q4+Q5+Q6+Q7
 * (Q5 no se aplica a tabaco).
 */

const SUSTANCIAS = [
  { codigo: "tabaco", nombre: "Tabaco (cigarrillos, tabaco de mascar, puros)" },
  { codigo: "alcohol", nombre: "Bebidas alcohólicas (cerveza, vino, licores)" },
  { codigo: "cannabis", nombre: "Cannabis (marihuana, hachís)" },
  { codigo: "cocaina", nombre: "Cocaína (coca, crack, pasta base)" },
  { codigo: "anfetaminas", nombre: "Estimulantes de tipo anfetamina (speed, éxtasis, metanfetamina)" },
  { codigo: "inhalantes", nombre: "Inhalantes (neoprén, pegamento, bencina, solventes)" },
  { codigo: "sedantes", nombre: "Sedantes o pastillas para dormir (benzodiacepinas) sin receta" },
  { codigo: "alucinogenos", nombre: "Alucinógenos (LSD, hongos, ketamina)" },
  { codigo: "opiaceos", nombre: "Opiáceos (heroína, morfina, metadona, tramadol sin receta)" },
  { codigo: "otras", nombre: "Otras sustancias" },
] as const;

const OP_SI_NO = [
  { valor: 1, etiqueta: "Sí" },
  { valor: 0, etiqueta: "No" },
];
const OP_Q2 = [
  { valor: 0, etiqueta: "Nunca" },
  { valor: 2, etiqueta: "1 o 2 veces" },
  { valor: 3, etiqueta: "Mensualmente" },
  { valor: 4, etiqueta: "Semanalmente" },
  { valor: 6, etiqueta: "A diario o casi a diario" },
];
const OP_Q3 = [
  { valor: 0, etiqueta: "Nunca" },
  { valor: 3, etiqueta: "1 o 2 veces" },
  { valor: 4, etiqueta: "Mensualmente" },
  { valor: 5, etiqueta: "Semanalmente" },
  { valor: 6, etiqueta: "A diario o casi a diario" },
];
const OP_Q4 = [
  { valor: 0, etiqueta: "Nunca" },
  { valor: 4, etiqueta: "1 o 2 veces" },
  { valor: 5, etiqueta: "Mensualmente" },
  { valor: 6, etiqueta: "Semanalmente" },
  { valor: 7, etiqueta: "A diario o casi a diario" },
];
const OP_Q5 = [
  { valor: 0, etiqueta: "Nunca" },
  { valor: 5, etiqueta: "1 o 2 veces" },
  { valor: 6, etiqueta: "Mensualmente" },
  { valor: 7, etiqueta: "Semanalmente" },
  { valor: 8, etiqueta: "A diario o casi a diario" },
];
const OP_HISTORICO = [
  { valor: 0, etiqueta: "No, nunca" },
  { valor: 6, etiqueta: "Sí, en los últimos 3 meses" },
  { valor: 3, etiqueta: "Sí, pero no en los últimos 3 meses" },
];

const items: ItemTest[] = [];
const subescalas: SubescalaDef[] = [];

for (const s of SUSTANCIAS) {
  const q1 = `as_${s.codigo}_q1`;
  items.push({
    id: q1,
    texto: `A lo largo de su vida, ¿ha consumido alguna vez ${s.nombre}?`,
    opciones: OP_SI_NO,
    subescala: s.codigo,
    noPuntua: true,
  });
  items.push({
    id: `as_${s.codigo}_q2`,
    texto: `En los últimos 3 meses, ¿con qué frecuencia ha consumido ${s.nombre}?`,
    opciones: OP_Q2,
    subescala: s.codigo,
    dependeDe: { itemId: q1, valorMin: 1 },
  });
  items.push({
    id: `as_${s.codigo}_q3`,
    texto: `En los últimos 3 meses, ¿con qué frecuencia ha sentido un fuerte deseo o ansias de consumir ${s.nombre}?`,
    opciones: OP_Q3,
    subescala: s.codigo,
    dependeDe: { itemId: q1, valorMin: 1 },
  });
  items.push({
    id: `as_${s.codigo}_q4`,
    texto: `En los últimos 3 meses, ¿con qué frecuencia el consumo de ${s.nombre} le ha causado problemas de salud, sociales, legales o económicos?`,
    opciones: OP_Q4,
    subescala: s.codigo,
    dependeDe: { itemId: q1, valorMin: 1 },
  });
  if (s.codigo !== "tabaco") {
    items.push({
      id: `as_${s.codigo}_q5`,
      texto: `En los últimos 3 meses, ¿con qué frecuencia dejó de hacer lo que habitualmente se esperaba de usted por el consumo de ${s.nombre}?`,
      opciones: OP_Q5,
      subescala: s.codigo,
      dependeDe: { itemId: q1, valorMin: 1 },
    });
  }
  items.push({
    id: `as_${s.codigo}_q6`,
    texto: `¿Un amigo, familiar u otra persona ha mostrado alguna vez preocupación por su consumo de ${s.nombre}?`,
    opciones: OP_HISTORICO,
    subescala: s.codigo,
    dependeDe: { itemId: q1, valorMin: 1 },
  });
  items.push({
    id: `as_${s.codigo}_q7`,
    texto: `¿Ha intentado alguna vez reducir o eliminar el consumo de ${s.nombre} y no lo ha logrado?`,
    opciones: OP_HISTORICO,
    subescala: s.codigo,
    dependeDe: { itemId: q1, valorMin: 1 },
  });

  const esAlcohol = s.codigo === "alcohol";
  subescalas.push({
    codigo: s.codigo,
    nombre: s.nombre,
    rangos: [
      {
        min: 0,
        max: esAlcohol ? 10 : 3,
        etiqueta: "Riesgo bajo — no requiere intervención",
        nivel: "success",
      },
      {
        min: esAlcohol ? 11 : 4,
        max: 26,
        etiqueta: "Riesgo moderado — intervención breve",
        nivel: "warning",
      },
      {
        min: 27,
        max: 42,
        etiqueta: "Riesgo alto — tratamiento intensivo",
        nivel: "danger",
      },
    ],
  });
}

export const ASSIST: TestDefinition = {
  codigo: "ASSIST",
  nombre: "Prueba de Detección de Consumo de Alcohol, Tabaco y Sustancias (OMS)",
  nombreCorto: "ASSIST",
  tipo: "libre",
  descripcion:
    "Screening de consumo de sustancias con puntaje de involucramiento por sustancia (OMS v3.0).",
  instrucciones:
    "Las siguientes preguntas se refieren a su experiencia con el consumo de distintas sustancias a lo largo de la vida y en los últimos 3 meses. Responda con honestidad; la información es confidencial.",
  marcoTemporal: "Vida / últimos 3 meses",
  items,
  rangos: [],
  subescalas,
  fuente: "OMS, ASSIST v3.0 (2010). Instrumento de libre uso de la OMS.",
};
