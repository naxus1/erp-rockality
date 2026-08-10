/**
 * REPOSITORY — Clientes
 *
 * CRUD completo para la tabla clientes.
 * Incluye búsqueda por nombre/teléfono y anonimización (habeas data).
 */
import { getDatabase } from '../db/connection.js';

export interface Cliente {
  id: number;
  nombre: string;
  telefono: string | null;
  email: string | null;
  notas: string | null;
  consentimiento_datos: number;
  consentimiento_fecha: string | null;
  activo: number;
  created_at: string;
  updated_at: string;
}

export interface CreateClienteData {
  nombre: string;
  telefono?: string;
  email?: string;
  notas?: string;
  consentimiento_datos?: number;
}

export interface UpdateClienteData {
  nombre?: string;
  telefono?: string;
  email?: string;
  notas?: string;
  consentimiento_datos?: number;
}

export function findAll(includeInactive = false): Cliente[] {
  const db = getDatabase();
  const where = includeInactive ? '' : 'WHERE activo = 1';
  return db.prepare(`SELECT * FROM clientes ${where} ORDER BY nombre`).all() as Cliente[];
}

export function findById(id: number): Cliente | undefined {
  const db = getDatabase();
  return db.prepare('SELECT * FROM clientes WHERE id = ?').get(id) as Cliente | undefined;
}

export function search(query: string): Cliente[] {
  const db = getDatabase();
  const param = `%${query}%`;
  return db
    .prepare(
      `SELECT * FROM clientes
       WHERE activo = 1 AND (nombre LIKE ? OR telefono LIKE ? OR email LIKE ?)
       ORDER BY nombre
       LIMIT 20`,
    )
    .all(param, param, param) as Cliente[];
}

export function create(data: CreateClienteData): Cliente {
  const db = getDatabase();
  const consentimiento = data.consentimiento_datos ?? 0;
  const consentimientoFecha = consentimiento ? new Date().toISOString() : null;

  const result = db
    .prepare(
      `INSERT INTO clientes (nombre, telefono, email, notas, consentimiento_datos, consentimiento_fecha)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(
      data.nombre,
      data.telefono || null,
      data.email || null,
      data.notas || null,
      consentimiento,
      consentimientoFecha,
    );

  return findById(Number(result.lastInsertRowid))!;
}

export function update(id: number, data: UpdateClienteData): Cliente | undefined {
  const db = getDatabase();
  const current = findById(id);
  if (!current) return undefined;

  // Si cambia el consentimiento, registrar la fecha
  let consentimientoFecha = current.consentimiento_fecha;
  if (
    data.consentimiento_datos !== undefined &&
    data.consentimiento_datos !== current.consentimiento_datos
  ) {
    consentimientoFecha = data.consentimiento_datos ? new Date().toISOString() : null;
  }

  db.prepare(
    `UPDATE clientes SET
       nombre = ?, telefono = ?, email = ?, notas = ?,
       consentimiento_datos = ?, consentimiento_fecha = ?,
       updated_at = datetime('now')
     WHERE id = ?`,
  ).run(
    data.nombre ?? current.nombre,
    data.telefono ?? current.telefono,
    data.email ?? current.email,
    data.notas ?? current.notas,
    data.consentimiento_datos ?? current.consentimiento_datos,
    consentimientoFecha,
    id,
  );

  return findById(id);
}

export function deactivate(id: number): boolean {
  const db = getDatabase();
  const result = db
    .prepare("UPDATE clientes SET activo = 0, updated_at = datetime('now') WHERE id = ?")
    .run(id);
  return result.changes > 0;
}

/**
 * Anonimiza un cliente (derecho de supresión — Ley 1581 de 2012).
 * Reemplaza datos personales con genéricos pero mantiene el historial de ventas intacto.
 */
export function anonimizar(id: number): boolean {
  const db = getDatabase();
  const result = db
    .prepare(
      `UPDATE clientes SET
         nombre = 'Cliente anonimizado',
         telefono = NULL,
         email = NULL,
         notas = 'Datos eliminados por solicitud del titular',
         activo = 0,
         updated_at = datetime('now')
       WHERE id = ?`,
    )
    .run(id);
  return result.changes > 0;
}
