"use client";

export function BotonImprimir() {
  return (
    <button
      onClick={() => window.print()}
      className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-light print:hidden"
    >
      Imprimir / guardar como PDF
    </button>
  );
}
