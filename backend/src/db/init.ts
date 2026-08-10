/**
 * INIT — Inicialización de la base de datos
 *
 * Ejecuta las migraciones pendientes al arrancar el servidor.
 * En desarrollo, crea la DB automáticamente si no existe.
 */
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import { getDatabase } from './connection.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function initDatabase(): void {
  const db = getDatabase();

  // Crear tabla de control de migraciones
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // Leer y aplicar migraciones pendientes
  const migrationsDir = path.join(__dirname, 'migrations');
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  const applied = new Set(
    db
      .prepare('SELECT name FROM _migrations')
      .all()
      .map((row) => (row as { name: string }).name),
  );

  let count = 0;
  for (const file of files) {
    if (applied.has(file)) continue;

    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
    const migrate = db.transaction(() => {
      db.exec(sql);
      db.prepare('INSERT INTO _migrations (name) VALUES (?)').run(file);
    });

    migrate();
    count++;
    console.warn(`  [DB] ✓ Migración aplicada: ${file}`);
  }

  if (count === 0) {
    console.warn('  [DB] Base de datos al día.');
  }
}
