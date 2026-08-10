/**
 * MIGRATE — Sistema de migraciones para SQLite
 *
 * ¿Cómo funciona?
 * 1. Lee todos los archivos .sql de la carpeta migrations/
 * 2. Los ordena por número (001, 002, 003...)
 * 3. Revisa cuáles ya se aplicaron (tabla _migrations)
 * 4. Ejecuta solo los que faltan, en orden
 *
 * Esto permite que la base de datos se actualice incrementalmente
 * sin perder datos existentes.
 *
 * Para correr: npx tsx src/db/migrate.ts
 */
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import { getDatabase, closeDatabase } from './connection.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function runMigrations(): void {
  const db = getDatabase();

  // Crear tabla de control de migraciones (si no existe)
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // Leer archivos de migración
  const migrationsDir = path.join(__dirname, 'migrations');
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort(); // Ordena: 001_xxx.sql, 002_xxx.sql, etc.

  // Obtener migraciones ya aplicadas
  const applied = new Set(
    db
      .prepare('SELECT name FROM _migrations')
      .all()
      .map((row) => (row as { name: string }).name),
  );

  // Ejecutar las que faltan
  let count = 0;
  for (const file of files) {
    if (applied.has(file)) {
      continue; // Ya se aplicó, saltar
    }

    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');

    // Ejecutar migración dentro de una transacción (todo o nada)
    const migrate = db.transaction(() => {
      db.exec(sql);
      db.prepare('INSERT INTO _migrations (name) VALUES (?)').run(file);
    });

    migrate();
    count++;
    console.warn(`  ✓ ${file}`);
  }

  if (count === 0) {
    console.warn('  Base de datos al día — no hay migraciones pendientes.');
  } else {
    console.warn(`\n  ${count} migración(es) aplicada(s) exitosamente.`);
  }

  closeDatabase();
}

// Ejecutar si se llama directamente
console.warn('\n[ERP Rockality] Ejecutando migraciones...\n');
runMigrations();
console.warn('');
