"use client";

import { useMemo, useState } from "react";
import type { TestDefinition } from "@/lib/tests/types";

/**
 * Reproductor de tests declarativo (PRD M2): renderiza cualquier
 * instrumento desde su definición, con ítems condicionales
 * (ej: ASSIST solo profundiza en sustancias consumidas).
 */
export function TestPlayer({
  def,
  action,
}: {
  def: TestDefinition;
  action: (formData: FormData) => Promise<void>;
}) {
  const [respuestas, setRespuestas] = useState<Record<string, number>>({});
  const [enviando, setEnviando] = useState(false);

  const visibles = useMemo(
    () =>
      def.items.filter((item) => {
        if (!item.dependeDe) return true;
        const v = respuestas[item.dependeDe.itemId];
        return v !== undefined && v >= item.dependeDe.valorMin;
      }),
    [def.items, respuestas]
  );

  const respondidas = visibles.filter((i) => respuestas[i.id] !== undefined).length;
  const completo = respondidas === visibles.length && visibles.length > 0;

  return (
    <form
      action={async (fd) => {
        setEnviando(true);
        try {
          await action(fd);
        } finally {
          setEnviando(false);
        }
      }}
      className="space-y-6"
    >
      <div className="rounded-lg bg-accent-soft/20 px-4 py-3 text-sm text-ink/80">
        <p className="font-medium">{def.instrucciones}</p>
        {def.marcoTemporal && (
          <p className="mt-1 text-xs text-ink/50">
            Marco temporal: {def.marcoTemporal}
          </p>
        )}
      </div>

      <div className="sticky top-0 z-10 rounded-lg border border-border bg-surface px-4 py-2 text-xs text-ink/60">
        Progreso: {respondidas} / {visibles.length}
        <div className="mt-1 h-1.5 w-full overflow-hidden rounded bg-border">
          <div
            className="h-full bg-primary transition-all"
            style={{
              width: `${visibles.length ? (respondidas / visibles.length) * 100 : 0}%`,
            }}
          />
        </div>
      </div>

      <ol className="space-y-5">
        {visibles.map((item, idx) => (
          <li key={item.id} className="rounded-xl border border-border bg-surface p-4">
            <p className="text-sm font-medium text-ink">
              {idx + 1}. {item.texto}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {item.opciones.map((op) => {
                const activa = respuestas[item.id] === op.valor;
                return (
                  <label
                    key={op.valor}
                    className={`cursor-pointer rounded-lg border px-3 py-1.5 text-sm transition ${
                      activa
                        ? "border-primary bg-primary text-white"
                        : "border-border bg-paper text-ink/80 hover:border-primary-light"
                    }`}
                  >
                    <input
                      type="radio"
                      name={item.id}
                      value={op.valor}
                      checked={activa}
                      onChange={() =>
                        setRespuestas((r) => ({ ...r, [item.id]: op.valor }))
                      }
                      className="sr-only"
                    />
                    {op.etiqueta}
                  </label>
                );
              })}
            </div>
          </li>
        ))}
      </ol>

      <button
        type="submit"
        disabled={!completo || enviando}
        className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-medium text-white transition hover:bg-primary-light disabled:opacity-40"
      >
        {enviando
          ? "Enviando…"
          : completo
            ? "Enviar respuestas"
            : `Responde las ${visibles.length - respondidas} preguntas restantes`}
      </button>
    </form>
  );
}
