import type { AIProvider, RespuestaIA, SolicitudIA } from "./types";

export function openaiProvider(apiKey: string, modelo: string): AIProvider {
  return {
    proveedor: "openai",
    async generar(s: SolicitudIA): Promise<RespuestaIA> {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: modelo,
          max_tokens: s.maxTokens ?? 4096,
          messages: [
            { role: "system", content: s.sistema },
            { role: "user", content: s.usuario },
          ],
        }),
      });
      if (!res.ok) {
        throw new Error(`OpenAI API ${res.status}: ${await res.text()}`);
      }
      const data = await res.json();
      return {
        texto: data.choices?.[0]?.message?.content ?? "",
        modelo,
        tokensInput: data.usage?.prompt_tokens ?? 0,
        tokensOutput: data.usage?.completion_tokens ?? 0,
      };
    },
  };
}
