/**
 * INIT — Inicialización de la base de datos (PostgreSQL / Neon)
 *
 * Aplica el esquema consolidado `postgres/schema.sql` al arrancar. El script es
 * IDEMPOTENTE (CREATE TABLE IF NOT EXISTS + seeds con ON CONFLICT DO NOTHING),
 * así que puede ejecutarse en cada arranque sin duplicar ni romper datos.
 *
 * Sustituye al antiguo sistema de migraciones incrementales de SQLite: el
 * esquema ya está portado y consolidado en un solo archivo.
 */
import path from 'path';
import fs from 'fs';

import { query } from './connection.js';

export async function initDatabase(): Promise<void> {
  // El schema.sql se copia a dist/db/postgres/ en el build (ver package.json).
  const schemaPath = path.join(__dirname, 'postgres', 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf-8');

  await query(sql);
  console.warn('  [DB] Esquema PostgreSQL aplicado (idempotente).');
}
