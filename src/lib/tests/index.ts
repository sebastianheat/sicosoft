import { PHQ9 } from "./instruments/phq9";
import { GAD7 } from "./instruments/gad7";
import { GOLDBERG } from "./instruments/goldberg";
import { AUDIT } from "./instruments/audit";
import { ASSIST } from "./instruments/assist";
import type { TestDefinition } from "./types";

/**
 * Registro de instrumentos de libre uso (PRD M2 v1).
 * La definición en código es la fuente de verdad del MVP;
 * agregar un instrumento nuevo = agregar su definición aquí.
 */
export const TESTS: Record<string, TestDefinition> = {
  [PHQ9.codigo]: PHQ9,
  [GAD7.codigo]: GAD7,
  [GOLDBERG.codigo]: GOLDBERG,
  [AUDIT.codigo]: AUDIT,
  [ASSIST.codigo]: ASSIST,
};

export function getTest(codigo: string): TestDefinition | null {
  return TESTS[codigo] ?? null;
}

export const LISTA_TESTS = Object.values(TESTS);

export { corregirTest, itemVisible, itemsPendientes } from "./scoring";
export type * from "./types";
