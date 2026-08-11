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
  ciudad: string | null;
  sexo: string | null;
  canal_captacion_id: number | null;
  consentimiento_datos: number;
  consentimiento_fecha: string | null;
  notas: string | null;
  notas_salud: string | null;
  activo: number;
  created_at: string;
  updated_at: string;
}

export interface ClienteConEdad extends Cliente {
  edad: number | null;
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
  ciudad?: string;
  sexo?: string;
  canal_captacion_id?: number;
  consentimiento_datos?: number;
  notas?: string;
  notas_salud?: string;
}

export interface UpdateClienteData {
  nombre?: string;
  apellidos?: string;
  telefono?: string;
  email?: string;
  fecha_nacimiento?: string;
  direccion?: string;
  ciudad?: string;
  sexo?: string;
  canal_captacion_id?: number;
  consentimiento_datos?: number;
  notas?: string;
  consentimiento_datos?: number;
  notas?: string;
  notas_salud?: string;
}

// Query base con edad calculada y nombre del canal
const SELECT_CLIENTE = `
  SELECT c.*,
    CASE
      WHEN c.fecha_nacimiento IS NOT NULL
      THEN CAST((julianday('now') - julianday(c.fecha_nacimiento)) / 365.25 AS INTEGER)
      ELSE NULL
    END as edad,
    cc.nombre as canal_captacion_nombre
  FROM clientes c
  LEFT JOIN canales_captacion cc ON c.canal_captacion_id = cc.id
`;

export function findAll(includeInactive = false): ClienteConEdad[] {
  const db = getDatabase();
  const where = includeInactive ? '' : 'WHERE c.activo = 1';
  return db
    .prepare(`${SELECT_CLIENTE} ${where} ORDER BY c.nombre, c.apellidos`)
    .all() as ClienteConEdad[];
}

export function findByCedula(cedula: string): ClienteConEdad | undefined {
  const db = getDatabase();
  return db.prepare(`${SELECT_CLIENTE} WHERE c.cedula = ?`).get(cedula) as
    | ClienteConEdad
    | undefined;
}

export function search(query: string): ClienteConEdad[] {
  const db = getDatabase();
  const param = `%${query}%`;
  return db
    .prepare(
      `${SELECT_CLIENTE}
       WHERE c.activo = 1 AND (c.nombre LIKE ? OR c.apellidos LIKE ? OR c.telefono LIKE ? OR c.cedula LIKE ?)
       ORDER BY c.nombre, c.apellidos
       LIMIT 20`,
    )
    .all(param, param, param, param) as ClienteConEdad[];
}

export function create(data: CreateClienteData): ClienteConEdad {
  const db = getDatabase();
  const consentimiento = data.consentimiento_datos ?? 0;
  const consentimientoFecha = consentimiento ? new Date().toISOString() : null;

  db.prepare(
    `INSERT INTO clientes (cedula, nombre, apellidos, telefono, email, fecha_nacimiento, direccion, ciudad, sexo, canal_captacion_id, consentimiento_datos, consentimiento_fecha, notas, notas_salud)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    data.cedula,
    data.nombre,
    data.apellidos,
    data.telefono || null,
    data.email || null,
    data.fecha_nacimiento || null,
    data.direccion || null,
    data.ciudad || null,
    data.sexo || null,
    data.canal_captacion_id || null,
    consentimiento,
    consentimientoFecha,
    data.notas || null,
    data.notas_salud || null,
  );

  return findByCedula(data.cedula)!;
}

export function update(cedula: string, data: UpdateClienteData): ClienteConEdad | undefined {
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
       fecha_nacimiento = ?, direccion = ?, ciudad = ?, sexo = ?,
       canal_captacion_id = ?, consentimiento_datos = ?, consentimiento_fecha = ?,
       notas = ?, notas_salud = ?, updated_at = datetime('now')
     WHERE cedula = ?`,
  ).run(
    data.nombre ?? current.nombre,
    data.apellidos ?? current.apellidos,
    data.telefono ?? current.telefono,
    data.email ?? current.email,
    data.fecha_nacimiento ?? current.fecha_nacimiento,
    data.direccion ?? current.direccion,
    data.ciudad ?? current.ciudad,
    data.sexo ?? current.sexo,
    data.canal_captacion_id ?? current.canal_captacion_id,
    data.consentimiento_datos ?? current.consentimiento_datos,
    consentimientoFecha,
    data.notas ?? current.notas,
    data.notas_salud ?? current.notas_salud,
    cedula,
  );

  return findByCedula(cedula);
}

export function deactivate(cedula: string): boolean {
  const db = getDatabase();
  const result = db
    .prepare("UPDATE clientes SET activo = 0, updated_at = datetime('now') WHERE cedula = ?")
    .run(cedula);
  return result.changes > 0;
}

export function anonimizar(cedula: string): boolean {
  const db = getDatabase();
  const result = db
    .prepare(
      `UPDATE clientes SET
         nombre = 'Anonimizado', apellidos = 'Anonimizado',
         telefono = NULL, email = NULL, fecha_nacimiento = NULL,
         direccion = NULL, ciudad = NULL,
         notas = 'Datos eliminados por solicitud del titular',
         activo = 0, updated_at = datetime('now')
       WHERE cedula = ?`,
    )
    .run(cedula);
  return result.changes > 0;
}
