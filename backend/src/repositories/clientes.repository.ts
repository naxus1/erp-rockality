/**
 * REPOSITORY — Clientes
 *
 * CRUD completo. PK = cédula.
 * La edad se calcula desde fecha_nacimiento (no se almacena).
 */
import { getDatabase } from '../db/connection.js';

export interface Cliente {
  cedula: string;
  nombre: string;
  apellidos: string;
  telefono: string | null;
  email: string | null;
  fecha_nacimiento: string | null;
  direccion: string | null;
  ciudad_id: number | null;
  sexo_id: number | null;
  canal_captacion_id: number | null;
  consentimiento_datos: number;
  consentimiento_fecha: string | null;
  notas: string | null;
  notas_salud: string | null;
  instagram: string | null;
  linkedin: string | null;
  activo: number;
  created_at: string;
  created_by: string | null;
  updated_at: string;
  updated_by: string | null;
}

export interface ClienteConRelaciones extends Cliente {
  edad: number | null;
  ciudad_nombre: string | null;
  sexo_nombre: string | null;
  canal_captacion_nombre: string | null;
}

export interface CreateClienteData {
  cedula: string;
  nombre: string;
  apellidos: string;
  telefono?: string;
  email?: string;
  fecha_nacimiento?: string;
  direccion?: string;
  ciudad_id?: number;
  sexo_id?: number;
  canal_captacion_id?: number;
  consentimiento_datos?: number;
  notas?: string;
  notas_salud?: string;
  instagram?: string;
  linkedin?: string;
  created_by?: string;
}

export interface UpdateClienteData {
  nombre?: string;
  apellidos?: string;
  telefono?: string;
  email?: string;
  fecha_nacimiento?: string;
  direccion?: string;
  ciudad_id?: number;
  sexo_id?: number;
  canal_captacion_id?: number;
  consentimiento_datos?: number;
  notas?: string;
  notas_salud?: string;
  instagram?: string;
  linkedin?: string;
  updated_by?: string;
}

// Query base con edad calculada y nombres de catálogos
const SELECT_CLIENTE = `
  SELECT c.*,
    CASE
      WHEN c.fecha_nacimiento IS NOT NULL
      THEN CAST((julianday('now') - julianday(c.fecha_nacimiento)) / 365.25 AS INTEGER)
      ELSE NULL
    END as edad,
    ci.nombre as ciudad_nombre,
    s.nombre as sexo_nombre,
    cc.nombre as canal_captacion_nombre
  FROM clientes c
  LEFT JOIN ciudades ci ON c.ciudad_id = ci.id
  LEFT JOIN sexos s ON c.sexo_id = s.id
  LEFT JOIN canales_captacion cc ON c.canal_captacion_id = cc.id
`;

export function findAll(includeInactive = false): ClienteConRelaciones[] {
  const db = getDatabase();
  const where = includeInactive ? '' : 'WHERE c.activo = 1';
  return db
    .prepare(`${SELECT_CLIENTE} ${where} ORDER BY c.nombre, c.apellidos`)
    .all() as ClienteConRelaciones[];
}

export function findByCedula(cedula: string): ClienteConRelaciones | undefined {
  const db = getDatabase();
  return db.prepare(`${SELECT_CLIENTE} WHERE c.cedula = ?`).get(cedula) as
    | ClienteConRelaciones
    | undefined;
}

export function search(query: string): ClienteConRelaciones[] {
  const db = getDatabase();
  const param = `%${query}%`;
  return db
    .prepare(
      `${SELECT_CLIENTE}
       WHERE c.activo = 1 AND (c.nombre LIKE ? OR c.apellidos LIKE ? OR c.telefono LIKE ? OR c.cedula LIKE ?)
       ORDER BY c.nombre, c.apellidos
       LIMIT 20`,
    )
    .all(param, param, param, param) as ClienteConRelaciones[];
}

export function create(data: CreateClienteData): ClienteConRelaciones {
  const db = getDatabase();
  const consentimiento = data.consentimiento_datos ?? 0;
  const consentimientoFecha = consentimiento ? new Date().toISOString() : null;

  db.prepare(
    `INSERT INTO clientes (cedula, nombre, apellidos, telefono, email, fecha_nacimiento, direccion, ciudad_id, sexo_id, canal_captacion_id, consentimiento_datos, consentimiento_fecha, notas, notas_salud, instagram, linkedin, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    data.cedula,
    data.nombre,
    data.apellidos,
    data.telefono || null,
    data.email || null,
    data.fecha_nacimiento || null,
    data.direccion || null,
    data.ciudad_id || null,
    data.sexo_id || null,
    data.canal_captacion_id || null,
    consentimiento,
    consentimientoFecha,
    data.notas || null,
    data.notas_salud || null,
    data.instagram || null,
    data.linkedin || null,
    data.created_by || null,
  );

  return findByCedula(data.cedula)!;
}

export function update(cedula: string, data: UpdateClienteData): ClienteConRelaciones | undefined {
  const db = getDatabase();
  const current = findByCedula(cedula);
  if (!current) return undefined;

  let consentimientoFecha = current.consentimiento_fecha;
  if (
    data.consentimiento_datos !== undefined &&
    data.consentimiento_datos !== current.consentimiento_datos
  ) {
    consentimientoFecha = data.consentimiento_datos ? new Date().toISOString() : null;
  }

  db.prepare(
    `UPDATE clientes SET
       nombre = ?, apellidos = ?, telefono = ?, email = ?,
       fecha_nacimiento = ?, direccion = ?, ciudad_id = ?, sexo_id = ?,
       canal_captacion_id = ?, consentimiento_datos = ?, consentimiento_fecha = ?,
       notas = ?, notas_salud = ?, instagram = ?, linkedin = ?, updated_at = datetime('now'), updated_by = ?
     WHERE cedula = ?`,
  ).run(
    data.nombre ?? current.nombre,
    data.apellidos ?? current.apellidos,
    data.telefono ?? current.telefono,
    data.email ?? current.email,
    data.fecha_nacimiento ?? current.fecha_nacimiento,
    data.direccion ?? current.direccion,
    data.ciudad_id ?? current.ciudad_id,
    data.sexo_id ?? current.sexo_id,
    data.canal_captacion_id ?? current.canal_captacion_id,
    data.consentimiento_datos ?? current.consentimiento_datos,
    consentimientoFecha,
    data.notas ?? current.notas,
    data.notas_salud ?? current.notas_salud,
    data.instagram ?? current.instagram,
    data.linkedin ?? current.linkedin,
    data.updated_by || null,
    cedula,
  );

  return findByCedula(cedula);
}

export function deactivate(cedula: string, updatedBy?: string): boolean {
  const db = getDatabase();
  const result = db
    .prepare(
      "UPDATE clientes SET activo = 0, updated_at = datetime('now'), updated_by = ? WHERE cedula = ?",
    )
    .run(updatedBy || null, cedula);
  return result.changes > 0;
}

export function anonimizar(cedula: string, updatedBy?: string): boolean {
  const db = getDatabase();
  const result = db
    .prepare(
      `UPDATE clientes SET
         nombre = 'Anonimizado', apellidos = 'Anonimizado',
         telefono = NULL, email = NULL, fecha_nacimiento = NULL,
         direccion = NULL, ciudad_id = NULL, sexo_id = NULL,
         notas = 'Datos eliminados por solicitud del titular',
         notas_salud = NULL,
         activo = 0, updated_at = datetime('now'), updated_by = ?
       WHERE cedula = ?`,
    )
    .run(updatedBy || null, cedula);
  return result.changes > 0;
}
