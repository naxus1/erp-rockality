/**
 * REPOSITORY — Suscripciones
 */
import { query, queryOne } from '../db/connection.js';

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

// dias_restantes: diferencia en días entre fecha_fin (TEXT YYYY-MM-DD) y hoy.
// En Postgres, restar dos date da un integer de días (equivale al CAST previo).
const SELECT_SUSCRIPCION = `
  SELECT s.*,
    c.nombre as cliente_nombre, c.apellidos as cliente_apellidos,
    p.nombre as plan_nombre, p.modalidad as plan_modalidad,
    (s.fecha_fin::date - CURRENT_DATE) as dias_restantes
  FROM suscripciones s
  JOIN clientes c ON s.cliente_cedula = c.cedula
  JOIN planes p ON s.plan_id = p.id
`;

export async function findAll(filters?: { estado?: string }): Promise<SuscripcionConRelaciones[]> {
  const conditions: string[] = [];
  const params: string[] = [];

  if (filters?.estado) {
    params.push(filters.estado);
    conditions.push(`s.estado = $${params.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const res = await query<SuscripcionConRelaciones>(
    `${SELECT_SUSCRIPCION} ${where} ORDER BY s.fecha_fin ASC`,
    params,
  );
  return res.rows;
}

export async function findByCliente(cedula: string): Promise<SuscripcionConRelaciones[]> {
  const res = await query<SuscripcionConRelaciones>(
    `${SELECT_SUSCRIPCION} WHERE s.cliente_cedula = $1 ORDER BY s.fecha_inicio DESC`,
    [cedula],
  );
  return res.rows;
}

export async function findPorVencer(dias: number): Promise<SuscripcionConRelaciones[]> {
  const res = await query<SuscripcionConRelaciones>(
    `${SELECT_SUSCRIPCION} WHERE s.estado = 'activa' AND (s.fecha_fin::date - CURRENT_DATE) BETWEEN 0 AND $1 ORDER BY s.fecha_fin ASC`,
    [dias],
  );
  return res.rows;
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
export async function create(
  data: CreateSuscripcionData,
): Promise<SuscripcionConRelaciones | undefined> {
  const planRes = await query<{ duracion_dias: number }>(
    'SELECT duracion_dias FROM planes WHERE id = $1',
    [data.plan_id],
  );
  const plan = planRes.rows[0];
  if (!plan) return undefined;

  const cliRes = await query<{ cedula: string }>('SELECT cedula FROM clientes WHERE cedula = $1', [
    data.cliente_cedula,
  ]);
  if (!cliRes.rows[0]) return undefined;

  const fechaInicio = new Date().toISOString().split('T')[0];
  const fechaFin = new Date(Date.now() + plan.duracion_dias * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  const inserted = await queryOne<{ id: number }>(
    `INSERT INTO suscripciones (cliente_cedula, plan_id, venta_id, fecha_inicio, fecha_fin, monto_pagado, notas, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
    [
      data.cliente_cedula,
      data.plan_id,
      data.venta_id ?? null,
      fechaInicio,
      fechaFin,
      data.monto_pagado ?? 0,
      data.notas || null,
      data.created_by || null,
    ],
  );

  const out = await query<SuscripcionConRelaciones>(`${SELECT_SUSCRIPCION} WHERE s.id = $1`, [
    inserted.id,
  ]);
  return out.rows[0];
}

/** Cuenta cuántas suscripciones de cortesía (plan con precio 0) ha tenido un cliente */
export async function contarCortesias(cedula: string): Promise<number> {
  const row = await queryOne<{ n: number }>(
    `SELECT COUNT(*)::int as n
     FROM suscripciones s JOIN planes p ON s.plan_id = p.id
     WHERE s.cliente_cedula = $1 AND p.precio = 0`,
    [cedula],
  );
  return row.n;
}

/** Marcar como vencidas las que ya pasaron fecha_fin */
export async function actualizarVencidas(): Promise<number> {
  const res = await query(
    "UPDATE suscripciones SET estado = 'vencida' WHERE estado = 'activa' AND fecha_fin::date < CURRENT_DATE",
  );
  return res.rowCount ?? 0;
}
