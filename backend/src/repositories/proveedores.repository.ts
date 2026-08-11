/**
 * REPOSITORY — Proveedores
 *
 * CRUD completo. PK = NIT.
 */
import { getDatabase } from '../db/connection.js';

export interface Proveedor {
  nit: string;
  nombre_empresa: string;
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

export interface CreateProveedorData {
  nit: string;
  nombre_empresa: string;
  direccion?: string;
  telefono?: string;
  nombre_contacto?: string;
  observaciones?: string;
  created_by?: string;
}

export interface UpdateProveedorData {
  nombre_empresa?: string;
  direccion?: string;
  telefono?: string;
  nombre_contacto?: string;
  observaciones?: string;
  updated_by?: string;
}

export function findAll(includeInactive = false): Proveedor[] {
  const db = getDatabase();
  const where = includeInactive ? '' : 'WHERE activo = 1';
  return db
    .prepare(`SELECT * FROM proveedores ${where} ORDER BY nombre_empresa`)
    .all() as Proveedor[];
}

export function findByNit(nit: string): Proveedor | undefined {
  const db = getDatabase();
  return db.prepare('SELECT * FROM proveedores WHERE nit = ?').get(nit) as Proveedor | undefined;
}

export function search(query: string): Proveedor[] {
  const db = getDatabase();
  const param = `%${query}%`;
  return db
    .prepare(
      `SELECT * FROM proveedores
       WHERE activo = 1 AND (nombre_empresa LIKE ? OR nit LIKE ? OR nombre_contacto LIKE ?)
       ORDER BY nombre_empresa LIMIT 20`,
    )
    .all(param, param, param) as Proveedor[];
}

export function create(data: CreateProveedorData): Proveedor {
  const db = getDatabase();
  db.prepare(
    `INSERT INTO proveedores (nit, nombre_empresa, direccion, telefono, nombre_contacto, observaciones, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    data.nit,
    data.nombre_empresa,
    data.direccion || null,
    data.telefono || null,
    data.nombre_contacto || null,
    data.observaciones || null,
    data.created_by || null,
  );
  return findByNit(data.nit)!;
}

export function update(nit: string, data: UpdateProveedorData): Proveedor | undefined {
  const db = getDatabase();
  const current = findByNit(nit);
  if (!current) return undefined;

  db.prepare(
    `UPDATE proveedores SET
       nombre_empresa = ?, direccion = ?, telefono = ?,
       nombre_contacto = ?, observaciones = ?,
       updated_at = datetime('now'), updated_by = ?
     WHERE nit = ?`,
  ).run(
    data.nombre_empresa ?? current.nombre_empresa,
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
      "UPDATE proveedores SET activo = 0, updated_at = datetime('now'), updated_by = ? WHERE nit = ?",
    )
    .run(updatedBy || null, nit);
  return result.changes > 0;
}
