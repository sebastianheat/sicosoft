import type { RangoSeveridad, ResultadoTest, TestDefinition } from "./types";

function rangoDe(rangos: RangoSeveridad[], puntaje: number): RangoSeveridad | null {
  return rangos.find((r) => puntaje >= r.min && puntaje <= r.max) ?? null;
}

/** Un ítem cuenta solo si está visible según sus dependencias. */
export function itemVisible(
  def: TestDefinition,
  itemId: string,
  respuestas: Record<string, number>
): boolean {
  const item = def.items.find((i) => i.id === itemId);
  if (!item?.dependeDe) return true;
  const valorPadre = respuestas[item.dependeDe.itemId];
  return valorPadre !== undefined && valorPadre >= item.dependeDe.valorMin;
}

/**
 * Corrección automática (PRD M2): puntaje total, subescalas,
 * rango de severidad y alertas de riesgo — todo desde la definición.
 */
export function corregirTest(
  def: TestDefinition,
  respuestas: Record<string, number>
): ResultadoTest {
  let total = 0;
  const porSubescala: Record<string, number> = {};
  const alertasRiesgo: ResultadoTest["alertasRiesgo"] = [];

  for (const item of def.items) {
    const valor = respuestas[item.id];
    if (valor === undefined) continue;
    if (!itemVisible(def, item.id, respuestas)) continue;
    if (item.alertaRiesgo && valor > 0) {
      alertasRiesgo.push({ itemId: item.id, texto: item.texto, valor });
    }
    if (item.noPuntua) continue;
    total += valor;
    if (item.subescala) {
      porSubescala[item.subescala] = (porSubescala[item.subescala] ?? 0) + valor;
    }
  }

  const rangoTotal = def.rangos.length ? rangoDe(def.rangos, total) : null;

  const subescalas = (def.subescalas ?? []).map((sub) => {
    const puntaje = porSubescala[sub.codigo] ?? 0;
    const rango = rangoDe(sub.rangos, puntaje);
    return {
      codigo: sub.codigo,
      nombre: sub.nombre,
      puntaje,
      severidad: rango?.etiqueta ?? null,
      nivel: rango?.nivel ?? null,
      sobrePuntoCorte:
        sub.puntoCorte !== undefined ? puntaje >= sub.puntoCorte : null,
    };
  });

  return {
    puntajeTotal: total,
    severidad: rangoTotal?.etiqueta ?? null,
    nivel: rangoTotal?.nivel ?? null,
    subescalas,
    alertasRiesgo,
  };
}

/** Ítems pendientes de respuesta considerando dependencias (para validar envío). */
export function itemsPendientes(
  def: TestDefinition,
  respuestas: Record<string, number>
): string[] {
  return def.items
    .filter((i) => itemVisible(def, i.id, respuestas) && respuestas[i.id] === undefined)
    .map((i) => i.id);
}
