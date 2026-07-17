import type { AIProvider, RespuestaIA, SolicitudIA } from "./types";

export function googleProvider(apiKey: string, modelo: string): AIProvider {
  return {
    proveedor: "google",
    async generar(s: SolicitudIA): Promise<RespuestaIA> {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-goog-api-key": apiKey,
          },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: s.sistema }] },
            contents: [{ role: "user", parts: [{ text: s.usuario }] }],
            generationConfig: { maxOutputTokens: s.maxTokens ?? 4096 },
          }),
        }
      );
      if (!res.ok) {
        throw new Error(`Google API ${res.status}: ${await res.text()}`);
      }
      const data = await res.json();
      const texto =
        data.candidates?.[0]?.content?.parts
          ?.map((p: { text?: string }) => p.text ?? "")
          .join("") ?? "";
      return {
        texto,
        modelo,
        tokensInput: data.usageMetadata?.promptTokenCount ?? 0,
        tokensOutput: data.usageMetadata?.candidatesTokenCount ?? 0,
      };
    },
  };
}
