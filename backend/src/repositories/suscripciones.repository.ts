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

export interface CreateSuscripcionData {
  cliente_cedula: string;
  plan_id: number;
  monto_pagado?: number; // centavos; 0 para cortesía
  venta_id?: number | null;
  notas?: string;
  created_by?: string;
}

/**
 * Crea una suscripción directa (sin venta). Usado para la semana de cortesía:
 * monto_pagado = 0, venta_id = NULL. La fecha_fin se calcula desde la duración del plan.
 * Devuelve undefined si el plan o el cliente no existen.
 */
export function create(data: CreateSuscripcionData): SuscripcionConRelaciones | undefined {
  const db = getDatabase();

  const plan = db.prepare('SELECT duracion_dias FROM planes WHERE id = ?').get(data.plan_id) as
    | { duracion_dias: number }
    | undefined;
  if (!plan) return undefined;

  const cliente = db
    .prepare('SELECT cedula FROM clientes WHERE cedula = ?')
    .get(data.cliente_cedula) as { cedula: string } | undefined;
  if (!cliente) return undefined;

  const fechaInicio = new Date().toISOString().split('T')[0];
  const fechaFin = new Date(Date.now() + plan.duracion_dias * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  const result = db
    .prepare(
      `INSERT INTO suscripciones (cliente_cedula, plan_id, venta_id, fecha_inicio, fecha_fin, monto_pagado, notas, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      data.cliente_cedula,
      data.plan_id,
      data.venta_id ?? null,
      fechaInicio,
      fechaFin,
      data.monto_pagado ?? 0,
      data.notas || null,
      data.created_by || null,
    );

  return db
    .prepare(`${SELECT_SUSCRIPCION} WHERE s.id = ?`)
    .get(Number(result.lastInsertRowid)) as SuscripcionConRelaciones;
}

/** Cuenta cuántas suscripciones de cortesía (plan con precio 0) ha tenido un cliente */
export function contarCortesias(cedula: string): number {
  const db = getDatabase();
  const row = db
    .prepare(
      `SELECT COUNT(*) as n
       FROM suscripciones s JOIN planes p ON s.plan_id = p.id
       WHERE s.cliente_cedula = ? AND p.precio = 0`,
    )
    .get(cedula) as { n: number };
  return row.n;
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
