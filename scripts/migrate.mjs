#!/usr/bin/env node
/**
 * Runner de migraciones idempotente: aplica en orden los .sql de
 * db/migrations/ que no estén registrados en _migraciones.
 * Uso: DATABASE_URL=postgres://… npm run db:migrate
 */
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Falta DATABASE_URL");
  process.exit(1);
}

const local = url.includes("localhost") || url.includes("127.0.0.1");
const sql = postgres(url, { ssl: local ? false : "require", max: 1 });

const dir = join(process.cwd(), "db", "migrations");
const archivos = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();

await sql`create table if not exists _migraciones (
  nombre text primary key,
  aplicada_at timestamptz not null default now()
)`;

const aplicadas = new Set(
  (await sql`select nombre from _migraciones`).map((r) => r.nombre)
);

for (const archivo of archivos) {
  if (aplicadas.has(archivo)) {
    console.log(`✓ ${archivo} (ya aplicada)`);
    continue;
  }
  const contenido = await readFile(join(dir, archivo), "utf8");
  console.log(`→ aplicando ${archivo}…`);
  await sql.begin(async (tx) => {
    await tx.unsafe(contenido);
    await tx`insert into _migraciones (nombre) values (${archivo})`;
  });
  console.log(`✓ ${archivo}`);
}

await sql.end();
console.log("Migraciones al día.");
