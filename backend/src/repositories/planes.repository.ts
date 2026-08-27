/**
 * REPOSITORY — Planes de entrenamiento
 */
import { getDatabase } from '../db/connection.js';

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

export function findAll(includeInactive = false): Plan[] {
  const db = getDatabase();
  const where = includeInactive ? '' : 'WHERE activo = 1';
  return db.prepare(`SELECT * FROM planes ${where} ORDER BY nombre`).all() as Plan[];
}

export function findById(id: number): Plan | undefined {
  const db = getDatabase();
  return db.prepare('SELECT * FROM planes WHERE id = ?').get(id) as Plan | undefined;
}

export function create(data: CreatePlanData): Plan {
  const db = getDatabase();
  const result = db
    .prepare(
      `INSERT INTO planes (nombre, modalidad, duracion_dias, precio, aplica_iva, porcentaje_iva, descripcion, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      data.nombre,
      data.modalidad,
      data.duracion_dias,
      data.precio,
      data.aplica_iva ?? 0,
      data.porcentaje_iva ?? 19,
      data.descripcion || null,
      data.created_by || null,
    );
  return findById(Number(result.lastInsertRowid))!;
}

export function update(id: number, data: UpdatePlanData): Plan | undefined {
  const db = getDatabase();
  const current = findById(id);
  if (!current) return undefined;

  // Si se reactiva el plan (activo pasa a 1), limpiamos el motivo de inactivación
  const activoFinal = data.activo ?? current.activo;
  const motivoFinal =
    activoFinal === 1 ? null : (data.motivo_inactivacion ?? current.motivo_inactivacion);

  db.prepare(
    `UPDATE planes SET nombre = ?, modalidad = ?, duracion_dias = ?, precio = ?,
     aplica_iva = ?, porcentaje_iva = ?, descripcion = ?, activo = ?, motivo_inactivacion = ?,
     updated_at = datetime('now'), updated_by = ? WHERE id = ?`,
  ).run(
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
  );
  return findById(id);
}
