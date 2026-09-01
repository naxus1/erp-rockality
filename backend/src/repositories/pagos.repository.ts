/**
 * REPOSITORY — Pagos (abonos)
 *
 * Registra pagos parciales o completos vinculados a una venta.
 * Actualiza el estado de la venta automáticamente cuando se completa el pago.
 */
import { query, withTransaction, type Executor } from '../db/connection.js';
import { registrarMovimientoEfectivo } from './caja.repository.js';

export interface Pago {
  id: number;
  venta_id: number;
  monto: number;
  fecha: string;
  metodo_pago_id: number;
  referencia: string | null;
  notas: string | null;
  created_at: string;
  created_by: string | null;
}

export interface PagoConMetodo extends Pago {
  metodo_pago_nombre: string;
}

export interface CreatePagoData {
  venta_id: number;
  monto: number;
  metodo_pago_id: number;
  referencia?: string;
  notas?: string;
  created_by?: string;
}

const SELECT_PAGO = `
  SELECT p.*, mp.nombre as metodo_pago_nombre
  FROM pagos p
  JOIN metodos_pago mp ON p.metodo_pago_id = mp.id
`;

export async function findByVenta(ventaId: number): Promise<PagoConMetodo[]> {
  const res = await query<PagoConMetodo>(`${SELECT_PAGO} WHERE p.venta_id = $1 ORDER BY p.fecha`, [
    ventaId,
  ]);
  return res.rows;
}

export async function findById(id: number): Promise<PagoConMetodo | undefined> {
  const res = await query<PagoConMetodo>(`${SELECT_PAGO} WHERE p.id = $1`, [id]);
  return res.rows[0];
}

/** Suma total de pagos realizados a una venta (opcionalmente sobre un client de tx). */
export async function totalPagado(ventaId: number, db: Executor = poolExecutor()): Promise<number> {
  const res = await db.query<{ total: number }>(
    'SELECT COALESCE(SUM(monto), 0)::bigint as total FROM pagos WHERE venta_id = $1',
    [ventaId],
  );
  return Number(res.rows[0]!.total);
}

/**
 * Registra un pago y actualiza el estado de la venta si ya está completa.
 */
export async function create(data: CreatePagoData): Promise<PagoConMetodo> {
  const pagoId = await withTransaction(async (client) => {
    // Insertar el pago
    const insert = await client.query<{ id: number }>(
      `INSERT INTO pagos (venta_id, monto, metodo_pago_id, referencia, notas, created_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [
        data.venta_id,
        data.monto,
        data.metodo_pago_id,
        data.referencia || null,
        data.notas || null,
        data.created_by || null,
      ],
    );
    const id = insert.rows[0]!.id;

    // Verificar si la venta ya está pagada por completo
    const ventaRes = await client.query<{ total: number }>(
      'SELECT total FROM ventas WHERE id = $1',
      [data.venta_id],
    );
    const venta = ventaRes.rows[0];

    if (venta) {
      const pagado = await totalPagado(data.venta_id, client);
      if (pagado >= venta.total) {
        await client.query("UPDATE ventas SET estado = 'pagada' WHERE id = $1", [data.venta_id]);
      }
    }

    // Caja: si el pago fue en efectivo y hay sesión abierta, entra a la caja.
    await registrarMovimientoEfectivo(client, {
      metodo_pago_id: data.metodo_pago_id,
      tipo: 'ingreso',
      monto: data.monto,
      origen: 'pago',
      referencia_tipo: 'venta',
      referencia_id: data.venta_id,
      motivo: `Pago en efectivo venta #${data.venta_id}`,
      created_by: data.created_by,
    });

    return id;
  });

  return (await findById(pagoId))!;
}

/** Saldo pendiente de una venta */
export async function saldoPendiente(ventaId: number): Promise<number> {
  const ventaRes = await query<{ total: number }>('SELECT total FROM ventas WHERE id = $1', [
    ventaId,
  ]);
  const venta = ventaRes.rows[0];
  if (!venta) return 0;
  return venta.total - (await totalPagado(ventaId));
}

/** Executor sobre el pool (para totalPagado fuera de una transacción). */
function poolExecutor(): Executor {
  return { query: (text, params) => query(text, params as unknown[]) };
}
