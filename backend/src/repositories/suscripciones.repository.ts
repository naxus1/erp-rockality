/**
 * REPOSITORY — Suscripciones
 */
import { getDatabase } from '../db/connection.js';

export interface Suscripcion {
  id: number;
  cliente_cedula: string;
  plan_id: number;
  venta_id: number | null;
  fecha_inicio: string;
  fecha_fin: string;
  estado: string;
  monto_pagado: number;
  notas: string | null;
  created_at: string;
  created_by: string | null;
}

export interface SuscripcionConRelaciones extends Suscripcion {
  cliente_nombre: string;
  cliente_apellidos: string;
  plan_nombre: string;
  plan_modalidad: string;
  dias_restantes: number;
}

const SELECT_SUSCRIPCION = `
  SELECT s.*,
    c.nombre as cliente_nombre, c.apellidos as cliente_apellidos,
    p.nombre as plan_nombre, p.modalidad as plan_modalidad,
    CAST(julianday(s.fecha_fin) - julianday('now') AS INTEGER) as dias_restantes
  FROM suscripciones s
  JOIN clientes c ON s.cliente_cedula = c.cedula
  JOIN planes p ON s.plan_id = p.id
`;

export function findAll(filters?: { estado?: string }): SuscripcionConRelaciones[] {
  const db = getDatabase();
  const conditions: string[] = [];
  const params: string[] = [];

  if (filters?.estado) {
    conditions.push('s.estado = ?');
    params.push(filters.estado);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  return db
    .prepare(`${SELECT_SUSCRIPCION} ${where} ORDER BY s.fecha_fin ASC`)
    .all(...params) as SuscripcionConRelaciones[];
}

export function findByCliente(cedula: string): SuscripcionConRelaciones[] {
  const db = getDatabase();
  return db
    .prepare(`${SELECT_SUSCRIPCION} WHERE s.cliente_cedula = ? ORDER BY s.fecha_inicio DESC`)
    .all(cedula) as SuscripcionConRelaciones[];
}

export function findPorVencer(dias: number): SuscripcionConRelaciones[] {
  const db = getDatabase();
  return db
    .prepare(
      `${SELECT_SUSCRIPCION} WHERE s.estado = 'activa' AND julianday(s.fecha_fin) - julianday('now') BETWEEN 0 AND ? ORDER BY s.fecha_fin ASC`,
    )
    .all(dias) as SuscripcionConRelaciones[];
}

/** Marcar como vencidas las que ya pasaron fecha_fin */
export function actualizarVencidas(): number {
  const db = getDatabase();
  const result = db
    .prepare(
      "UPDATE suscripciones SET estado = 'vencida' WHERE estado = 'activa' AND date(fecha_fin) < date('now')",
    )
    .run();
  return result.changes;
}
