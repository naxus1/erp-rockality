/**
 * CONNECTION — Conexión singleton a SQLite
 *
 * Crea una única instancia de la base de datos que se reutiliza
 * en toda la aplicación. Configurado con WAL mode para mejor
 * rendimiento en lecturas concurrentes.
 */
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

import { config } from '../config/index.js';

let db: Database.Database | null = null;

export function getDatabase(): Database.Database {
  if (db) return db;

  // Crear directorio si no existe (para desarrollo local)
  const dbDir = path.dirname(config.dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  db = new Database(config.dbPath);

  // Configuraciones de rendimiento y seguridad
  db.pragma('journal_mode = WAL'); // Write-Ahead Logging: lecturas no bloquean escrituras
  db.pragma('busy_timeout = 5000'); // Espera hasta 5s si la DB está ocupada
  db.pragma('synchronous = NORMAL'); // Balance entre seguridad y velocidad
  db.pragma('foreign_keys = ON'); // Activa validación de foreign keys

  return db;
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}
