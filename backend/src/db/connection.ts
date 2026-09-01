/**
 * CONNECTION — Pool de conexiones a PostgreSQL (Neon)
 *
 * Reemplaza la conexión SQLite (better-sqlite3) por un pool de `pg`.
 *
 * - Un único Pool singleton reutilizado en toda la app (y entre invocaciones
 *   Lambda en caliente). Neon recomienda usar la connection string POOLED.
 * - `query()` ejecuta una consulta sobre el pool (para operaciones simples).
 * - `withTransaction()` toma un client dedicado del pool, abre BEGIN, ejecuta
 *   el callback y hace COMMIT (o ROLLBACK si algo falla). Se usa en las
 *   operaciones multi-tabla (ventas, pagos, gastos, compras, caja).
 * - `Executor` es la interfaz común (Pool o PoolClient) que aceptan las
 *   funciones de los repositorios, para poder correr tanto sueltas como dentro
 *   de una transacción reutilizando el mismo client.
 *
 * TLS: Neon exige SSL. La DATABASE_URL trae `sslmode=require`; además forzamos
 * `ssl: { rejectUnauthorized: false }` por si el entorno no tiene el CA raíz.
 */
import { Pool, types, type PoolClient, type QueryResult, type QueryResultRow } from 'pg';

import { config } from '../config/index.js';

// pg devuelve BIGINT (OID 20) como string por defecto (para no perder precisión
// en enteros > 2^53). En este ERP los BIGINT son montos en centavos COP y conteos,
// todos muy por debajo de Number.MAX_SAFE_INTEGER, así que los parseamos a number
// para conservar el comportamiento previo (SQLite entregaba number) y evitar tener
// que castear en cada repositorio. NUMERIC/DECIMAL no se usan en el esquema.
types.setTypeParser(types.builtins.INT8, (val) => (val === null ? null : Number(val)));

/** Interfaz común: cualquier cosa capaz de ejecutar `query`. */
export interface Executor {
  query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: unknown[],
  ): Promise<QueryResult<T>>;
}

let pool: Pool | null = null;

/** Devuelve (creándolo si hace falta) el pool singleton de conexiones. */
export function getPool(): Pool {
  if (pool) return pool;

  if (!config.databaseUrl) {
    throw new Error(
      'DATABASE_URL no está configurada. Es obligatoria para conectarse a PostgreSQL (Neon).',
    );
  }

  pool = new Pool({
    connectionString: config.databaseUrl,
    ssl: { rejectUnauthorized: false },
    // Lambda: pocas conexiones, cierre relativamente rápido de las ociosas.
    max: config.isProduction ? 3 : 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });

  // Evita que un error en un client ocioso tumbe el proceso.
  pool.on('error', (err) => {
    console.error('[DB] Error inesperado en un client ocioso del pool:', err.message);
  });

  return pool;
}

/**
 * Ejecuta una consulta sobre el pool. Para operaciones simples (sin
 * transacción). Devuelve el QueryResult completo (filas en `.rows`,
 * conteo en `.rowCount`).
 */
export function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<QueryResult<T>> {
  return getPool().query<T>(text, params);
}

/**
 * Ejecuta una consulta que SIEMPRE debe devolver al menos una fila (INSERT ...
 * RETURNING, SELECT COUNT/SUM que devuelve una fila agregada, etc.) y retorna
 * esa primera fila ya tipada como no-opcional. Lanza si no hubo filas (lo que
 * indicaría un bug en la consulta, no un caso esperado).
 */
export async function queryOne<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<T> {
  const res = await getPool().query<T>(text, params);
  const row = res.rows[0];
  if (row === undefined) {
    throw new Error('La consulta no devolvió filas cuando se esperaba al menos una.');
  }
  return row;
}

/**
 * Ejecuta `fn` dentro de una transacción usando un client dedicado del pool.
 * Abre BEGIN, y hace COMMIT si `fn` resuelve o ROLLBACK si lanza. El client se
 * devuelve al pool en todos los casos. El callback recibe el client (que
 * implementa `Executor`) para propagarlo a las funciones de repositorio.
 */
export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch {
      /* si el rollback falla, propagamos el error original */
    }
    throw err;
  } finally {
    client.release();
  }
}

/** Cierra el pool (usado en scripts puntuales; no en runtime normal). */
export async function closeDatabase(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
