/**
 * REPOSITORY — Terceros
 *
 * Unifica: proveedores, empleados, empresas de servicios.
 * PK = NIT o cédula.
 */
import { getDatabase } from '../db/connection.js';
import { toUpper } from '../schemas/text.js';

export interface Tercero {
  nit: string;
  nombre: string;
  tipo_tercero_id: number;
  direccion: string | null;
  telefono: string | null;
  nombre_contacto: string | null;
  observaciones: string | null;
  activo: number;
  created_at: string;
  created_by: string | null;
  updated_at: string;
  updated_by: string | null;
}

export interface TerceroConTipo extends Tercero {
  tipo_tercero_nombre: string;
}

export interface CreateTerceroData {
  nit: string;
  nombre: string;
  tipo_tercero_id: number;
  direccion?: string;
  telefono?: string;
  nombre_contacto?: string;
  observaciones?: string;
  created_by?: string;
}

export interface UpdateTerceroData {
  nombre?: string;
  tipo_tercero_id?: number;
  direccion?: string;
  telefono?: string;
  nombre_contacto?: string;
  observaciones?: string;
  updated_by?: string;
}

const SELECT_TERCERO = `
  SELECT t.*, tt.nombre as tipo_tercero_nombre
  FROM terceros t
  JOIN tipos_tercero tt ON t.tipo_tercero_id = tt.id
`;

export function findAll(filters?: {
  tipo_tercero_id?: number;
  includeInactive?: boolean;
}): TerceroConTipo[] {
  const db = getDatabase();
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (!filters?.includeInactive) {
    conditions.push('t.activo = 1');
  }
  if (filters?.tipo_tercero_id) {
    conditions.push('t.tipo_tercero_id = ?');
    params.push(filters.tipo_tercero_id);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  return db
    .prepare(`${SELECT_TERCERO} ${where} ORDER BY t.nombre`)
    .all(...params) as TerceroConTipo[];
}

export function findByNit(nit: string): TerceroConTipo | undefined {
  const db = getDatabase();
  return db.prepare(`${SELECT_TERCERO} WHERE t.nit = ?`).get(nit) as TerceroConTipo | undefined;
}

export function search(query: string): TerceroConTipo[] {
  const db = getDatabase();
  // Datos en MAYÚSCULAS: comparamos UPPER(columna) contra el término normalizado
  // para búsqueda insensible a mayúsculas/acentos.
  const param = `%${toUpper(query)}%`;
  return db
    .prepare(
      `${SELECT_TERCERO}
       WHERE t.activo = 1 AND (UPPER(t.nombre) LIKE ? OR UPPER(t.nit) LIKE ? OR UPPER(t.nombre_contacto) LIKE ?)
       ORDER BY t.nombre LIMIT 20`,
    )
    .all(param, param, param) as TerceroConTipo[];
}

export function create(data: CreateTerceroData): TerceroConTipo {
  const db = getDatabase();
  db.prepare(
    `INSERT INTO terceros (nit, nombre, tipo_tercero_id, direccion, telefono, nombre_contacto, observaciones, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    data.nit,
    data.nombre,
    data.tipo_tercero_id,
    data.direccion || null,
    data.telefono || null,
    data.nombre_contacto || null,
    data.observaciones || null,
    data.created_by || null,
  );
  return findByNit(data.nit)!;
}

export function update(nit: string, data: UpdateTerceroData): TerceroConTipo | undefined {
  const db = getDatabase();
  const current = findByNit(nit);
  if (!current) return undefined;

  db.prepare(
    `UPDATE terceros SET
       nombre = ?, tipo_tercero_id = ?, direccion = ?, telefono = ?,
       nombre_contacto = ?, observaciones = ?,
       updated_at = datetime('now'), updated_by = ?
     WHERE nit = ?`,
  ).run(
    data.nombre ?? current.nombre,
    data.tipo_tercero_id ?? current.tipo_tercero_id,
    data.direccion ?? current.direccion,
    data.telefono ?? current.telefono,
    data.nombre_contacto ?? current.nombre_contacto,
    data.observaciones ?? current.observaciones,
    data.updated_by || null,
    nit,
  );
  return findByNit(nit);
}

export function deactivate(nit: string, updatedBy?: string): boolean {
  const db = getDatabase();
  const result = db
    .prepare(
      "UPDATE terceros SET activo = 0, updated_at = datetime('now'), updated_by = ? WHERE nit = ?",
    )
    .run(updatedBy || null, nit);
  return result.changes > 0;
}
