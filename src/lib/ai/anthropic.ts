import type { AIProvider, RespuestaIA, SolicitudIA } from "./types";

export function anthropicProvider(apiKey: string, modelo: string): AIProvider {
  return {
    proveedor: "anthropic",
    async generar(s: SolicitudIA): Promise<RespuestaIA> {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: modelo,
          max_tokens: s.maxTokens ?? 4096,
          system: s.sistema,
          messages: [{ role: "user", content: s.usuario }],
        }),
      });
      if (!res.ok) {
        throw new Error(`Anthropic API ${res.status}: ${await res.text()}`);
      }
      const data = await res.json();
      return {
        texto: data.content?.[0]?.text ?? "",
        modelo,
        tokensInput: data.usage?.input_tokens ?? 0,
        tokensOutput: data.usage?.output_tokens ?? 0,
      };
    },
  };
}
