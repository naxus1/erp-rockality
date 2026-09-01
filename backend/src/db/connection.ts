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
/** Borra los sidecars -wal/-shm/-journal residuales (p. ej. de un modo WAL
 *  anterior sobre EFS). Se hace ANTES de abrir para evitar locks heredados. */
function limpiarSidecars(dbPath: string): void {
  for (const suffix of ['-wal', '-shm', '-journal']) {
    const f = `${dbPath}${suffix}`;
    try {
      if (fs.existsSync(f)) fs.unlinkSync(f);
    } catch {
      /* si no se puede, continuar */
    }
  }
}

/** Aparta el archivo corrupto (y sus sidecars) con sufijo .corrupt-<ts>. */
function apartarCorrupta(dbPath: string): void {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  for (const suffix of ['', '-wal', '-shm', '-journal']) {
    const f = `${dbPath}${suffix}`;
    if (fs.existsSync(f)) {
      try {
        fs.renameSync(f, `${f}.corrupt-${stamp}`);
      } catch {
        try {
          fs.unlinkSync(f);
        } catch {
          /* último recurso: continuar */
        }
      }
    }
  }
}

function sleepSync(ms: number): void {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    /* espera activa breve (solo en arranque; evita depender de async aquí) */
  }
}

function openWithRecovery(dbPath: string): Database.Database {
  const abrir = () => {
    const instance = new Database(dbPath);
    // busy_timeout PRIMERO: si otra instancia tiene el lock, espera en vez de
    // fallar de inmediato. Clave sobre EFS con varias Lambdas arrancando.
    instance.pragma('busy_timeout = 15000');
    // Migrar de cualquier modo WAL previo a TRUNCATE (seguro en NFS/EFS).
    instance.pragma('journal_mode = TRUNCATE');
    instance.pragma('synchronous = FULL');
    instance.pragma('foreign_keys = ON');
    // Lectura real del header: detecta corrupción temprano.
    instance.prepare('SELECT count(*) FROM sqlite_master').get();
    return instance;
  };

  // Limpia sidecars WAL residuales antes del primer intento.
  limpiarSidecars(dbPath);

  const MAX_INTENTOS = 5;
  let ultimoError: unknown;
  for (let intento = 1; intento <= MAX_INTENTOS; intento++) {
    try {
      return abrir();
    } catch (err) {
      ultimoError = err;
      const msg = err instanceof Error ? err.message : String(err);

      if (/not a database|malformed|disk I\/O|file is encrypted/i.test(msg)) {
        // Corrupción: apartar y recrear.
        console.error(`[DB] Base corrupta (${msg}). Reinicializando...`);
        apartarCorrupta(dbPath);
        return abrir();
      }

      if (/database is locked|SQLITE_BUSY/i.test(msg)) {
        // Lock transitorio (otra instancia arrancando): limpiar sidecars y
        // reintentar con backoff.
        console.error(`[DB] Bloqueada (intento ${intento}/${MAX_INTENTOS}). Reintentando...`);
        limpiarSidecars(dbPath);
        sleepSync(500 * intento);
        continue;
      }

      throw err; // otro error: propagar
    }
  }
  throw ultimoError;
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
