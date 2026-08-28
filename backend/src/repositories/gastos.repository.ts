/**
 * REPOSITORY — Gastos
 *
 * Registro de gastos operativos con causación contable.
 * Separa periodo contable (mes al que pertenece) de fecha de pago.
 */
import { getDatabase } from '../db/connection.js';
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

export function findAll(filters?: {
  periodo_mes?: number;
  periodo_anio?: number;
  gerencia_id?: number;
  tipo_gasto_id?: number;
}): GastoConRelaciones[] {
  const db = getDatabase();
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (filters?.periodo_mes) {
    conditions.push('g.periodo_mes = ?');
    params.push(filters.periodo_mes);
  }
  if (filters?.periodo_anio) {
    conditions.push('g.periodo_anio = ?');
    params.push(filters.periodo_anio);
  }
  if (filters?.gerencia_id) {
    conditions.push('g.gerencia_id = ?');
    params.push(filters.gerencia_id);
  }
  if (filters?.tipo_gasto_id) {
    conditions.push('g.tipo_gasto_id = ?');
    params.push(filters.tipo_gasto_id);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  return db
    .prepare(`${SELECT_GASTO} ${where} ORDER BY g.fecha_pago DESC LIMIT 100`)
    .all(...params) as GastoConRelaciones[];
}

export function findById(id: number): GastoConRelaciones | undefined {
  const db = getDatabase();
  return db.prepare(`${SELECT_GASTO} WHERE g.id = ?`).get(id) as GastoConRelaciones | undefined;
}

export function create(data: CreateGastoData): GastoConRelaciones {
  const db = getDatabase();
  const ivaVal = data.iva ?? 0;
  const total = data.valor_base + ivaVal;

  const crearGasto = db.transaction(() => {
    const result = db
      .prepare(
        `INSERT INTO gastos (tercero_nit, gerencia_id, tipo_gasto_id, categoria_gasto_id, descripcion, valor_base, iva, total, periodo_mes, periodo_anio, fecha_pago, metodo_pago_id, referencia_pago, notas, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
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
      );

    const gastoId = Number(result.lastInsertRowid);

    // Caja: si el gasto se pagó en efectivo y hay sesión abierta, sale de la caja.
    registrarMovimientoEfectivo(db, {
      metodo_pago_id: data.metodo_pago_id,
      tipo: 'egreso',
      monto: total,
      origen: 'gasto',
      referencia_tipo: 'gasto',
      referencia_id: gastoId,
      motivo: `Gasto en efectivo #${gastoId}: ${data.descripcion}`,
      created_by: data.created_by,
    });

    return gastoId;
  });

  return findById(crearGasto())!;
}

/**
 * Edita solo campos no contables (descripción, notas, referencia) de un gasto
 * en estado 'registrado'. No permite cambiar montos ni periodo.
 * Devuelve undefined si el gasto no existe o ya está anulado.
 */
export function update(id: number, data: UpdateGastoData): GastoConRelaciones | undefined {
  const db = getDatabase();
  const current = db.prepare('SELECT * FROM gastos WHERE id = ?').get(id) as Gasto | undefined;
  if (!current || current.estado === 'anulado') return undefined;

  db.prepare(
    `UPDATE gastos SET descripcion = ?, referencia_pago = ?, notas = ?,
       updated_at = datetime('now'), updated_by = ?
     WHERE id = ?`,
  ).run(
    data.descripcion ?? current.descripcion,
    data.referencia_pago ?? current.referencia_pago,
    data.notas ?? current.notas,
    data.updated_by || null,
    id,
  );

  return findById(id);
}

/**
 * Anula un gasto dejando registro de quién y por qué.
 * Devuelve false si el gasto no existe o ya está anulado.
 */
export function anular(id: number, updatedBy?: string, motivo?: string): boolean {
  const db = getDatabase();
  const current = db.prepare('SELECT estado FROM gastos WHERE id = ?').get(id) as
    | { estado: string }
    | undefined;
  if (!current || current.estado === 'anulado') return false;

  db.prepare(
    `UPDATE gastos SET estado = 'anulado', updated_at = datetime('now'), updated_by = ?, motivo_anulacion = ?
     WHERE id = ?`,
  ).run(updatedBy || null, motivo || null, id);

  return true;
}

/** Total de gastos por periodo */
export function totalPorPeriodo(mes: number, anio: number): { total: number; count: number } {
  const db = getDatabase();
  const result = db
    .prepare(
      "SELECT COALESCE(SUM(total), 0) as total, COUNT(*) as count FROM gastos WHERE periodo_mes = ? AND periodo_anio = ? AND estado != 'anulado'",
    )
    .get(mes, anio) as { total: number; count: number };
  return result;
}
