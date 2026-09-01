/**
 * REPOSITORY — Gastos
 *
 * Registro de gastos operativos con causación contable.
 * Separa periodo contable (mes al que pertenece) de fecha de pago.
 */
import { query, queryOne, withTransaction } from '../db/connection.js';
import { registrarMovimientoEfectivo } from './caja.repository.js';

export interface Gasto {
  id: number;
  tercero_nit: string;
  gerencia_id: number;
  tipo_gasto_id: number;
  categoria_gasto_id: number;
  descripcion: string;
  valor_base: number;
  iva: number;
  total: number;
  periodo_mes: number;
  periodo_anio: number;
  fecha_pago: string;
  metodo_pago_id: number | null;
  referencia_pago: string | null;
  estado: string;
  notas: string | null;
  created_at: string;
  created_by: string | null;
  updated_at: string | null;
  updated_by: string | null;
  motivo_anulacion: string | null;
}

export interface GastoConRelaciones extends Gasto {
  tercero_nombre: string;
  gerencia_nombre: string;
  tipo_gasto_nombre: string;
  categoria_gasto_nombre: string;
  metodo_pago_nombre: string | null;
}

export interface CreateGastoData {
  tercero_nit: string;
  gerencia_id: number;
  tipo_gasto_id: number;
  categoria_gasto_id: number;
  descripcion: string;
  valor_base: number;
  iva?: number;
  periodo_mes: number;
  periodo_anio: number;
  fecha_pago?: string;
  metodo_pago_id?: number;
  referencia_pago?: string;
  notas?: string;
  created_by?: string;
}

/**
 * Edición limitada de un gasto ya registrado.
 * Por integridad contable SOLO se permiten campos no monetarios:
 * descripción, notas y referencia de pago. Si el monto o periodo están mal,
 * el gasto se anula y se registra uno nuevo (mantiene trazabilidad).
 */
export interface UpdateGastoData {
  descripcion?: string;
  referencia_pago?: string;
  notas?: string;
  updated_by?: string;
}

const SELECT_GASTO = `
  SELECT g.*,
    t.nombre as tercero_nombre,
    ger.nombre as gerencia_nombre,
    tg.nombre as tipo_gasto_nombre,
    cg.nombre as categoria_gasto_nombre,
    mp.nombre as metodo_pago_nombre
  FROM gastos g
  JOIN terceros t ON g.tercero_nit = t.nit
  JOIN gerencias ger ON g.gerencia_id = ger.id
  JOIN tipos_gasto tg ON g.tipo_gasto_id = tg.id
  JOIN categorias_gasto cg ON g.categoria_gasto_id = cg.id
  LEFT JOIN metodos_pago mp ON g.metodo_pago_id = mp.id
`;

export async function findAll(filters?: {
  periodo_mes?: number;
  periodo_anio?: number;
  gerencia_id?: number;
  tipo_gasto_id?: number;
}): Promise<GastoConRelaciones[]> {
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (filters?.periodo_mes) {
    params.push(filters.periodo_mes);
    conditions.push(`g.periodo_mes = $${params.length}`);
  }
  if (filters?.periodo_anio) {
    params.push(filters.periodo_anio);
    conditions.push(`g.periodo_anio = $${params.length}`);
  }
  if (filters?.gerencia_id) {
    params.push(filters.gerencia_id);
    conditions.push(`g.gerencia_id = $${params.length}`);
  }
  if (filters?.tipo_gasto_id) {
    params.push(filters.tipo_gasto_id);
    conditions.push(`g.tipo_gasto_id = $${params.length}`);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const res = await query<GastoConRelaciones>(
    `${SELECT_GASTO} ${where} ORDER BY g.fecha_pago DESC LIMIT 100`,
    params,
  );
  return res.rows;
}

export async function findById(id: number): Promise<GastoConRelaciones | undefined> {
  const res = await query<GastoConRelaciones>(`${SELECT_GASTO} WHERE g.id = $1`, [id]);
  return res.rows[0];
}

export async function create(data: CreateGastoData): Promise<GastoConRelaciones> {
  const ivaVal = data.iva ?? 0;
  const total = data.valor_base + ivaVal;

  const gastoId = await withTransaction(async (client) => {
    const result = await client.query<{ id: number }>(
      `INSERT INTO gastos (tercero_nit, gerencia_id, tipo_gasto_id, categoria_gasto_id, descripcion, valor_base, iva, total, periodo_mes, periodo_anio, fecha_pago, metodo_pago_id, referencia_pago, notas, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) RETURNING id`,
      [
        data.tercero_nit,
        data.gerencia_id,
        data.tipo_gasto_id,
        data.categoria_gasto_id,
        data.descripcion,
        data.valor_base,
        ivaVal,
        total,
        data.periodo_mes,
        data.periodo_anio,
        data.fecha_pago || new Date().toISOString().split('T')[0],
        data.metodo_pago_id || null,
        data.referencia_pago || null,
        data.notas || null,
        data.created_by || null,
      ],
    );

    const id = result.rows[0]!.id;

    // Caja: si el gasto se pagó en efectivo y hay sesión abierta, sale de la caja.
    await registrarMovimientoEfectivo(client, {
      metodo_pago_id: data.metodo_pago_id,
      tipo: 'egreso',
      monto: total,
      origen: 'gasto',
      referencia_tipo: 'gasto',
      referencia_id: id,
      motivo: `Gasto en efectivo #${id}: ${data.descripcion}`,
      created_by: data.created_by,
    });

    return id;
  });

  return (await findById(gastoId))!;
}

/**
 * Edita solo campos no contables (descripción, notas, referencia) de un gasto
 * en estado 'registrado'. No permite cambiar montos ni periodo.
 * Devuelve undefined si el gasto no existe o ya está anulado.
 */
export async function update(
  id: number,
  data: UpdateGastoData,
): Promise<GastoConRelaciones | undefined> {
  const currentRes = await query<Gasto>('SELECT * FROM gastos WHERE id = $1', [id]);
  const current = currentRes.rows[0];
  if (!current || current.estado === 'anulado') return undefined;

  await query(
    `UPDATE gastos SET descripcion = $1, referencia_pago = $2, notas = $3,
       updated_at = now(), updated_by = $4
     WHERE id = $5`,
    [
      data.descripcion ?? current.descripcion,
      data.referencia_pago ?? current.referencia_pago,
      data.notas ?? current.notas,
      data.updated_by || null,
      id,
    ],
  );

  return findById(id);
}

/**
 * Anula un gasto dejando registro de quién y por qué.
 * Devuelve false si el gasto no existe o ya está anulado.
 */
export async function anular(id: number, updatedBy?: string, motivo?: string): Promise<boolean> {
  const currentRes = await query<{ estado: string }>('SELECT estado FROM gastos WHERE id = $1', [
    id,
  ]);
  const current = currentRes.rows[0];
  if (!current || current.estado === 'anulado') return false;

  await query(
    `UPDATE gastos SET estado = 'anulado', updated_at = now(), updated_by = $1, motivo_anulacion = $2
     WHERE id = $3`,
    [updatedBy || null, motivo || null, id],
  );

  return true;
}

/** Total de gastos por periodo */
export async function totalPorPeriodo(
  mes: number,
  anio: number,
): Promise<{ total: number; count: number }> {
  const row = await queryOne<{ total: number; count: number }>(
    "SELECT COALESCE(SUM(total), 0)::bigint as total, COUNT(*)::int as count FROM gastos WHERE periodo_mes = $1 AND periodo_anio = $2 AND estado != 'anulado'",
    [mes, anio],
  );
  return { total: Number(row.total), count: row.count };
}
