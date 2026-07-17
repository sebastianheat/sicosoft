/**
 * Capa IA multi-modelo (PRD §3.1): interfaz única con implementaciones
 * por proveedor. El profesional elige modelo por tarea y usa su propia
 * API key (BYOK). Solo endpoints API con no-training garantizado.
 */

export type ProveedorIA = "anthropic" | "openai" | "google";

export type TareaIA = "resumen_sesion" | "informe_test" | "transcripcion";

export interface SolicitudIA {
  sistema: string;
  usuario: string;
  maxTokens?: number;
}

export interface RespuestaIA {
  texto: string;
  modelo: string;
  tokensInput: number;
  tokensOutput: number;
}

export interface AIProvider {
  proveedor: ProveedorIA;
  generar(solicitud: SolicitudIA): Promise<RespuestaIA>;
}

export const MODELOS_DEFAULT: Record<ProveedorIA, string> = {
  anthropic: "claude-sonnet-5",
  openai: "gpt-4o",
  google: "gemini-2.5-flash",
};
