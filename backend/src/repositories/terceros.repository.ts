/**
 * REPOSITORY — Terceros
 *
 * Unifica: proveedores, empleados, empresas de servicios.
 * PK = NIT o cédula.
 */
import { query } from '../db/connection.js';
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

export async function findAll(filters?: {
  tipo_tercero_id?: number;
  includeInactive?: boolean;
}): Promise<TerceroConTipo[]> {
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (!filters?.includeInactive) {
    conditions.push('t.activo = 1');
  }
  if (filters?.tipo_tercero_id) {
    params.push(filters.tipo_tercero_id);
    conditions.push(`t.tipo_tercero_id = $${params.length}`);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const res = await query<TerceroConTipo>(`${SELECT_TERCERO} ${where} ORDER BY t.nombre`, params);
  return res.rows;
}

export async function findByNit(nit: string): Promise<TerceroConTipo | undefined> {
  const res = await query<TerceroConTipo>(`${SELECT_TERCERO} WHERE t.nit = $1`, [nit]);
  return res.rows[0];
}

export async function search(queryStr: string): Promise<TerceroConTipo[]> {
  // Datos en MAYÚSCULAS: comparamos UPPER(columna) contra el término normalizado
  // para búsqueda insensible a mayúsculas/acentos.
  const param = `%${toUpper(queryStr)}%`;
  const res = await query<TerceroConTipo>(
    `${SELECT_TERCERO}
     WHERE t.activo = 1 AND (UPPER(t.nombre) LIKE $1 OR UPPER(t.nit) LIKE $1 OR UPPER(t.nombre_contacto) LIKE $1)
     ORDER BY t.nombre LIMIT 20`,
    [param],
  );
  return res.rows;
}

export async function create(data: CreateTerceroData): Promise<TerceroConTipo> {
  await query(
    `INSERT INTO terceros (nit, nombre, tipo_tercero_id, direccion, telefono, nombre_contacto, observaciones, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      data.nit,
      data.nombre,
      data.tipo_tercero_id,
      data.direccion || null,
      data.telefono || null,
      data.nombre_contacto || null,
      data.observaciones || null,
      data.created_by || null,
    ],
  );
  return (await findByNit(data.nit))!;
}

export async function update(
  nit: string,
  data: UpdateTerceroData,
): Promise<TerceroConTipo | undefined> {
  const current = await findByNit(nit);
  if (!current) return undefined;

  await query(
    `UPDATE terceros SET
       nombre = $1, tipo_tercero_id = $2, direccion = $3, telefono = $4,
       nombre_contacto = $5, observaciones = $6,
       updated_at = now(), updated_by = $7
     WHERE nit = $8`,
    [
      data.nombre ?? current.nombre,
      data.tipo_tercero_id ?? current.tipo_tercero_id,
      data.direccion ?? current.direccion,
      data.telefono ?? current.telefono,
      data.nombre_contacto ?? current.nombre_contacto,
      data.observaciones ?? current.observaciones,
      data.updated_by || null,
      nit,
    ],
  );
  return findByNit(nit);
}

export async function deactivate(nit: string, updatedBy?: string): Promise<boolean> {
  const res = await query(
    'UPDATE terceros SET activo = 0, updated_at = now(), updated_by = $1 WHERE nit = $2',
    [updatedBy || null, nit],
  );
  return (res.rowCount ?? 0) > 0;
}
