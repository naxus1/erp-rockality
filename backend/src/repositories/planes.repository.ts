/**
 * REPOSITORY — Planes de entrenamiento
 */
import { query, queryOne } from '../db/connection.js';

export interface Plan {
  id: number;
  nombre: string;
  modalidad: string;
  duracion_dias: number;
  precio: number;
  aplica_iva: number;
  porcentaje_iva: number;
  descripcion: string | null;
  activo: number;
  motivo_inactivacion: string | null;
  created_at: string;
  created_by: string | null;
  updated_at: string;
  updated_by: string | null;
}

export interface CreatePlanData {
  nombre: string;
  modalidad: string;
  duracion_dias: number;
  precio: number;
  aplica_iva?: number;
  porcentaje_iva?: number;
  descripcion?: string;
  created_by?: string;
}

export interface UpdatePlanData {
  nombre?: string;
  modalidad?: string;
  duracion_dias?: number;
  precio?: number;
  aplica_iva?: number;
  porcentaje_iva?: number;
  descripcion?: string;
  activo?: number;
  motivo_inactivacion?: string | null;
  updated_by?: string;
}

export async function findAll(includeInactive = false): Promise<Plan[]> {
  const where = includeInactive ? '' : 'WHERE activo = 1';
  const res = await query<Plan>(`SELECT * FROM planes ${where} ORDER BY nombre`);
  return res.rows;
}

export async function findById(id: number): Promise<Plan | undefined> {
  const res = await query<Plan>('SELECT * FROM planes WHERE id = $1', [id]);
  return res.rows[0];
}

export async function create(data: CreatePlanData): Promise<Plan> {
  const inserted = await queryOne<{ id: number }>(
    `INSERT INTO planes (nombre, modalidad, duracion_dias, precio, aplica_iva, porcentaje_iva, descripcion, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
    [
      data.nombre,
      data.modalidad,
      data.duracion_dias,
      data.precio,
      data.aplica_iva ?? 0,
      data.porcentaje_iva ?? 19,
      data.descripcion || null,
      data.created_by || null,
    ],
  );
  return (await findById(inserted.id))!;
}

export async function update(id: number, data: UpdatePlanData): Promise<Plan | undefined> {
  const current = await findById(id);
  if (!current) return undefined;

  // Si se reactiva el plan (activo pasa a 1), limpiamos el motivo de inactivación
  const activoFinal = data.activo ?? current.activo;
  const motivoFinal =
    activoFinal === 1 ? null : (data.motivo_inactivacion ?? current.motivo_inactivacion);

  await query(
    `UPDATE planes SET nombre = $1, modalidad = $2, duracion_dias = $3, precio = $4,
     aplica_iva = $5, porcentaje_iva = $6, descripcion = $7, activo = $8, motivo_inactivacion = $9,
     updated_at = now(), updated_by = $10 WHERE id = $11`,
    [
      data.nombre ?? current.nombre,
      data.modalidad ?? current.modalidad,
      data.duracion_dias ?? current.duracion_dias,
      data.precio ?? current.precio,
      data.aplica_iva ?? current.aplica_iva,
      data.porcentaje_iva ?? current.porcentaje_iva,
      data.descripcion ?? current.descripcion,
      activoFinal,
      motivoFinal,
      data.updated_by || null,
      id,
    ],
  );
  return findById(id);
}
