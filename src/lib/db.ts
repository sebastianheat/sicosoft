import "server-only";
import postgres from "postgres";

/**
 * Cliente Postgres único (Neon u otro proveedor conectado en Vercel).
 * DATABASE_URL la inyecta la integración de base de datos de Vercel.
 * La conexión es perezosa: se crea recién en la primera consulta,
 * para que el build no exija la variable.
 */
type Sql = ReturnType<typeof postgres>;

declare global {
  var __sql: Sql | undefined;
}

function crear(): Sql {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL no está configurada");
  return postgres(url, {
    ssl: url.includes("localhost") || url.includes("127.0.0.1") ? false : "require",
    max: 5,
    // compatible con pgbouncer / poolers serverless
    prepare: false,
  });
}

function obtener(): Sql {
  return (globalThis.__sql ??= crear());
}

export const sql: Sql = new Proxy((() => {}) as unknown as Sql, {
  apply(_target, _thisArg, args) {
    return Reflect.apply(obtener() as unknown as (...a: unknown[]) => unknown, undefined, args);
  },
  get(_target, prop) {
    const real = obtener() as unknown as Record<string | symbol, unknown>;
    const valor = real[prop];
    return typeof valor === "function" ? (valor as (...a: unknown[]) => unknown).bind(real) : valor;
  },
});
