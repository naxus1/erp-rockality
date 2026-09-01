/**
 * REPOSITORY — Clientes
 *
 * CRUD completo. PK = cédula.
 * La edad se calcula desde fecha_nacimiento (no se almacena).
 */
import { query } from '../db/connection.js';
import { encryptNullable, decrypt, hmac } from '../utils/crypto.js';
import { toUpper } from '../schemas/text.js';

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
  whatsapp: string | null;
  hace_ejercicio: number;
  referido_por: string | null;
  referido_por_nombre: string | null;
  telefono_hash: string | null;
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
  whatsapp?: string;
  hace_ejercicio?: number;
  referido_por?: string;
  referido_por_nombre?: string;
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
  whatsapp?: string;
  hace_ejercicio?: number;
  referido_por?: string;
  referido_por_nombre?: string;
  updated_by?: string;
}

// Query base con edad calculada y nombres de catálogos.
// Edad: años completos entre fecha_nacimiento (TEXT YYYY-MM-DD) y hoy.
const SELECT_CLIENTE = `
  SELECT c.*,
    CASE
      WHEN c.fecha_nacimiento IS NOT NULL
      THEN date_part('year', age(c.fecha_nacimiento::date))::int
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

/** Descifra las columnas sensibles (email, teléfono) de una fila leída. */
function descifrarFila<T extends ClienteConRelaciones | undefined>(row: T): T {
  if (!row) return row;
  row.email = decrypt(row.email);
  row.telefono = decrypt(row.telefono);
  return row;
}

export async function findAll(includeInactive = false): Promise<ClienteConRelaciones[]> {
  const where = includeInactive ? '' : 'WHERE c.activo = 1';
  const res = await query<ClienteConRelaciones>(
    `${SELECT_CLIENTE} ${where} ORDER BY c.nombre, c.apellidos`,
  );
  return res.rows.map((r) => descifrarFila(r));
}

export async function findByCedula(cedula: string): Promise<ClienteConRelaciones | undefined> {
  const res = await query<ClienteConRelaciones>(`${SELECT_CLIENTE} WHERE c.cedula = $1`, [cedula]);
  return descifrarFila(res.rows[0]);
}

export async function search(queryStr: string): Promise<ClienteConRelaciones[]> {
  // Los datos se guardan en MAYÚSCULAS. Normalizamos el término igual y comparamos
  // UPPER(columna) contra el término, para que la búsqueda sea insensible a
  // mayúsculas/minúsculas incluso con acentos y la Ñ.
  const param = `%${toUpper(queryStr)}%`;
  // El teléfono está cifrado: no se puede LIKE. Buscamos por nombre/apellidos/cédula
  // con LIKE, y además por teléfono exacto vía HMAC (si el término es un número).
  const telHash = hmac(queryStr);
  const res = await query<ClienteConRelaciones>(
    `${SELECT_CLIENTE}
     WHERE c.activo = 1 AND (
       UPPER(c.nombre) LIKE $1 OR UPPER(c.apellidos) LIKE $1 OR UPPER(c.cedula) LIKE $1 OR c.telefono_hash = $2
     )
     ORDER BY c.nombre, c.apellidos
     LIMIT 20`,
    [param, telHash],
  );
  return res.rows.map((r) => descifrarFila(r));
}

export async function create(data: CreateClienteData): Promise<ClienteConRelaciones> {
  const consentimiento = data.consentimiento_datos ?? 0;
  const consentimientoFecha = consentimiento ? new Date().toISOString() : null;

  await query(
    `INSERT INTO clientes (cedula, nombre, apellidos, telefono, telefono_hash, email, fecha_nacimiento, direccion, ciudad_id, sexo_id, canal_captacion_id, consentimiento_datos, consentimiento_fecha, notas, notas_salud, instagram, linkedin, whatsapp, hace_ejercicio, referido_por, referido_por_nombre, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)`,
    [
      data.cedula,
      data.nombre,
      data.apellidos,
      encryptNullable(data.telefono),
      hmac(data.telefono),
      encryptNullable(data.email),
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
      data.whatsapp || null,
      data.hace_ejercicio ?? 0,
      data.referido_por || null,
      data.referido_por_nombre || null,
      data.created_by || null,
    ],
  );

  return (await findByCedula(data.cedula))!;
}

export async function update(
  cedula: string,
  data: UpdateClienteData,
): Promise<ClienteConRelaciones | undefined> {
  const current = await findByCedula(cedula);
  if (!current) return undefined;

  let consentimientoFecha = current.consentimiento_fecha;
  if (
    data.consentimiento_datos !== undefined &&
    data.consentimiento_datos !== current.consentimiento_datos
  ) {
    consentimientoFecha = data.consentimiento_datos ? new Date().toISOString() : null;
  }

  // current.telefono/email vienen DESCIFRADOS de findByCedula; el valor final
  // (nuevo o el actual en claro) se vuelve a cifrar antes de guardar.
  const telefonoFinal = data.telefono ?? current.telefono;
  const emailFinal = data.email ?? current.email;

  // Referido: undefined = no tocar; string vacío = borrar (NULL). Así se puede
  // quitar un referido, no solo cambiarlo.
  const referidoPorFinal =
    data.referido_por === undefined ? current.referido_por : data.referido_por || null;
  const referidoPorNombreFinal =
    data.referido_por_nombre === undefined
      ? current.referido_por_nombre
      : data.referido_por_nombre || null;

  await query(
    `UPDATE clientes SET
       nombre = $1, apellidos = $2, telefono = $3, telefono_hash = $4, email = $5,
       fecha_nacimiento = $6, direccion = $7, ciudad_id = $8, sexo_id = $9,
       canal_captacion_id = $10, consentimiento_datos = $11, consentimiento_fecha = $12,
       notas = $13, notas_salud = $14, instagram = $15, linkedin = $16, whatsapp = $17,
       hace_ejercicio = $18, referido_por = $19, referido_por_nombre = $20,
       updated_at = now(), updated_by = $21
     WHERE cedula = $22`,
    [
      data.nombre ?? current.nombre,
      data.apellidos ?? current.apellidos,
      encryptNullable(telefonoFinal),
      hmac(telefonoFinal),
      encryptNullable(emailFinal),
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
      data.whatsapp ?? current.whatsapp,
      data.hace_ejercicio ?? current.hace_ejercicio,
      referidoPorFinal,
      referidoPorNombreFinal,
      data.updated_by || null,
      cedula,
    ],
  );

  return findByCedula(cedula);
}

export async function deactivate(cedula: string, updatedBy?: string): Promise<boolean> {
  const res = await query(
    'UPDATE clientes SET activo = 0, updated_at = now(), updated_by = $1 WHERE cedula = $2',
    [updatedBy || null, cedula],
  );
  return (res.rowCount ?? 0) > 0;
}

export async function anonimizar(cedula: string, updatedBy?: string): Promise<boolean> {
  const res = await query(
    `UPDATE clientes SET
       nombre = 'Anonimizado', apellidos = 'Anonimizado',
       telefono = NULL, telefono_hash = NULL, email = NULL, fecha_nacimiento = NULL,
       direccion = NULL, ciudad_id = NULL, sexo_id = NULL,
       notas = 'Datos eliminados por solicitud del titular',
       notas_salud = NULL, referido_por_nombre = NULL,
       activo = 0, updated_at = now(), updated_by = $1
     WHERE cedula = $2`,
    [updatedBy || null, cedula],
  );
  return (res.rowCount ?? 0) > 0;
}
