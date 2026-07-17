/**
 * Motor de tests declarativo (PRD M2): los instrumentos se definen como
 * datos, no como código. Agregar un test nuevo = agregar una definición.
 */

export interface OpcionRespuesta {
  valor: number;
  etiqueta: string;
}

export interface ItemTest {
  id: string;
  texto: string;
  opciones: OpcionRespuesta[];
  /** Subescala a la que aporta el ítem (ej: "ansiedad", "alcohol"). */
  subescala?: string;
  /** El ítem solo se muestra si otro ítem tiene valor >= valorMin. */
  dependeDe?: { itemId: string; valorMin: number };
  /** Ítem centinela de riesgo (ej: ítem 9 del PHQ-9): valor > 0 genera alerta. */
  alertaRiesgo?: boolean;
  /** Ítems que no suman al puntaje (ej: screening ASSIST Q1). */
  noPuntua?: boolean;
}

export interface RangoSeveridad {
  min: number;
  max: number;
  etiqueta: string;
  /** token de color: success | warning | danger */
  nivel: "success" | "warning" | "danger";
}

export interface SubescalaDef {
  codigo: string;
  nombre: string;
  rangos: RangoSeveridad[];
  /** Punto de corte clínico si aplica (Goldberg). */
  puntoCorte?: number;
}

export interface TestDefinition {
  codigo: string;
  nombre: string;
  nombreCorto: string;
  tipo: "libre" | "licenciado";
  descripcion: string;
  instrucciones: string;
  marcoTemporal?: string;
  items: ItemTest[];
  /** Rangos sobre el puntaje total (si el instrumento lo define). */
  rangos: RangoSeveridad[];
  subescalas?: SubescalaDef[];
  /** Segundos por ítem si el instrumento exige temporizador. */
  segundosPorItem?: number;
  fuente: string;
}

export interface ResultadoTest {
  puntajeTotal: number;
  severidad: string | null;
  nivel: "success" | "warning" | "danger" | null;
  subescalas: {
    codigo: string;
    nombre: string;
    puntaje: number;
    severidad: string | null;
    nivel: "success" | "warning" | "danger" | null;
    sobrePuntoCorte: boolean | null;
  }[];
  alertasRiesgo: { itemId: string; texto: string; valor: number }[];
}
