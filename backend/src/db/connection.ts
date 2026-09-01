/**
 * CONNECTION — Conexión singleton a SQLite
 *
 * Crea una única instancia de la base de datos que se reutiliza en toda la app.
 *
 * IMPORTANTE (Lambda + EFS): NO se usa WAL. El modo WAL de SQLite requiere
 * memoria compartida (mmap) entre procesos, que NFS/EFS no soporta de forma
 * fiable y provoca corrupción ("disk I/O error" -> "file is not a database").
 * Sobre EFS se usa journal_mode = TRUNCATE (rollback journal clásico, seguro en
 * NFS). Además la Lambda corre con concurrencia reservada = 1, así que no hay
 * escritores concurrentes sobre el archivo.
 */
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

import { config } from '../config/index.js';

let db: Database.Database | null = null;

/**
 * Abre la DB y verifica su integridad básica. Si el archivo está corrupto
 * ("file is not a database" / disk I/O), lo aparta con sufijo .corrupt-<ts> y
 * crea una base nueva, para que el servicio se recupere solo (las migraciones
 * recrean el esquema). Devuelve la instancia abierta.
 */
function openWithRecovery(dbPath: string): Database.Database {
  const abrir = () => {
    const instance = new Database(dbPath);
    // Pragmas seguros para EFS/NFS (sin WAL).
    instance.pragma('journal_mode = TRUNCATE');
    instance.pragma('busy_timeout = 10000'); // espera hasta 10s si está ocupada
    instance.pragma('synchronous = FULL'); // máxima durabilidad sobre EFS
    instance.pragma('foreign_keys = ON');
    // Fuerza una lectura real del header para detectar corrupción temprano.
    instance.prepare('SELECT count(*) FROM sqlite_master').get();
    return instance;
  };

  try {
    return abrir();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const corrupta = /not a database|malformed|disk I\/O|file is encrypted/i.test(msg);
    if (!corrupta) throw err;

    // Aparta el archivo corrupto (y sus sidecars) y crea uno nuevo.
    console.error(`[DB] Base corrupta detectada (${msg}). Reinicializando...`);
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    for (const suffix of ['', '-wal', '-shm', '-journal']) {
      const f = `${dbPath}${suffix}`;
      if (fs.existsSync(f)) {
        try {
          fs.renameSync(f, `${f}.corrupt-${stamp}`);
        } catch {
          // Si no se puede renombrar (p. ej. sidecar bloqueado), intentar borrar.
          try {
            fs.unlinkSync(f);
          } catch {
            /* último recurso: continuar */
          }
        }
      }
    }
    return abrir();
  }
}

export function getDatabase(): Database.Database {
  if (db) return db;

  // Crear directorio si no existe (para desarrollo local)
  const dbDir = path.dirname(config.dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  db = openWithRecovery(config.dbPath);
  return db;
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}
