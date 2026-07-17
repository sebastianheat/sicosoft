import { anthropicProvider } from "./anthropic";
import { googleProvider } from "./google";
import { openaiProvider } from "./openai";
import { MODELOS_DEFAULT, type AIProvider, type ProveedorIA, type TareaIA } from "./types";

export interface ConfigIAProfesional {
  /** proveedor preferido por tarea, ej: { resumen_sesion: "anthropic" } */
  proveedorPorTarea?: Partial<Record<TareaIA, ProveedorIA>>;
  /** modelo específico por proveedor (opcional, hay defaults) */
  modeloPorProveedor?: Partial<Record<ProveedorIA, string>>;
}

export function crearProvider(
  proveedor: ProveedorIA,
  apiKey: string,
  modelo?: string
): AIProvider {
  const m = modelo ?? MODELOS_DEFAULT[proveedor];
  switch (proveedor) {
    case "anthropic":
      return anthropicProvider(apiKey, m);
    case "openai":
      return openaiProvider(apiKey, m);
    case "google":
      return googleProvider(apiKey, m);
  }
}

export function proveedorParaTarea(
  config: ConfigIAProfesional,
  tarea: TareaIA
): ProveedorIA {
  return config.proveedorPorTarea?.[tarea] ?? "anthropic";
}

export * from "./types";
export * from "./prompts";
