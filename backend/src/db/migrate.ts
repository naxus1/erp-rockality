/**
 * MIGRATE — Aplica el esquema PostgreSQL (Neon)
 *
 * Con la migración a Postgres, el esquema quedó consolidado en un único archivo
 * idempotente (`postgres/schema.sql`) en vez de migraciones incrementales. Este
 * script simplemente lo aplica contra la DATABASE_URL configurada.
 *
 * Para correr: npm run migrate  (necesita DATABASE_URL en el entorno / .env)
 */
import { initDatabase } from './init.js';
import { closeDatabase } from './connection.js';

async function run(): Promise<void> {
  console.warn('\n[ERP Rockality] Aplicando esquema PostgreSQL...\n');
  await initDatabase();
  await closeDatabase();
  console.warn('\n  Esquema aplicado exitosamente.\n');
}

run().catch((err) => {
  console.error('[ERP Rockality] Error aplicando el esquema:', err);
  process.exit(1);
});
