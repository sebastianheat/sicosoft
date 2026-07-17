import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border border-border bg-surface p-5 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export function Titulo({ children }: { children: ReactNode }) {
  return <h1 className="text-2xl font-semibold text-ink">{children}</h1>;
}

export function Subtitulo({ children }: { children: ReactNode }) {
  return <h2 className="text-lg font-semibold text-ink">{children}</h2>;
}

const NIVEL_CLASES: Record<string, string> = {
  success: "bg-success/10 text-success border-success/30",
  warning: "bg-warning/10 text-warning border-warning/30",
  danger: "bg-danger/10 text-danger border-danger/30",
  neutral: "bg-accent-soft/30 text-ink border-accent-soft",
};

export function Badge({
  nivel = "neutral",
  children,
}: {
  nivel?: "success" | "warning" | "danger" | "neutral";
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${NIVEL_CLASES[nivel]}`}
    >
      {children}
    </span>
  );
}

export function BotonPrimario({
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }) {
  return (
    <button
      {...props}
      className={`rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-light disabled:opacity-50 ${props.className ?? ""}`}
    >
      {children}
    </button>
  );
}

export function BotonSecundario({
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }) {
  return (
    <button
      {...props}
      className={`rounded-lg border border-primary px-4 py-2 text-sm font-medium text-primary transition hover:bg-accent-soft/30 ${props.className ?? ""}`}
    >
      {children}
    </button>
  );
}

export const inputClase =
  "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-accent-soft";

export function Campo({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium text-ink/80">{label}</span>
      {children}
    </label>
  );
}

export function EstadoVacio({ mensaje }: { mensaje: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-ink/50">
      {mensaje}
    </div>
  );
}
