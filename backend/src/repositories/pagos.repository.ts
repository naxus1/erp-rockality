/**
 * REPOSITORY — Pagos (abonos)
 *
 * Registra pagos parciales o completos vinculados a una venta.
 * Actualiza el estado de la venta automáticamente cuando se completa el pago.
 */
import { getDatabase } from '../db/connection.js';

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

export function findByVenta(ventaId: number): PagoConMetodo[] {
  const db = getDatabase();
  return db
    .prepare(`${SELECT_PAGO} WHERE p.venta_id = ? ORDER BY p.fecha`)
    .all(ventaId) as PagoConMetodo[];
}

export function findById(id: number): PagoConMetodo | undefined {
  const db = getDatabase();
  return db.prepare(`${SELECT_PAGO} WHERE p.id = ?`).get(id) as PagoConMetodo | undefined;
}

/** Suma total de pagos realizados a una venta */
export function totalPagado(ventaId: number): number {
  const db = getDatabase();
  const result = db
    .prepare('SELECT COALESCE(SUM(monto), 0) as total FROM pagos WHERE venta_id = ?')
    .get(ventaId) as { total: number };
  return result.total;
}

/**
 * Registra un pago y actualiza el estado de la venta si ya está completa.
 */
export function create(data: CreatePagoData): PagoConMetodo {
  const db = getDatabase();

  const registrarPago = db.transaction(() => {
    // Insertar el pago
    const result = db
      .prepare(
        `INSERT INTO pagos (venta_id, monto, metodo_pago_id, referencia, notas, created_by)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(
        data.venta_id,
        data.monto,
        data.metodo_pago_id,
        data.referencia || null,
        data.notas || null,
        data.created_by || null,
      );

    // Verificar si la venta ya está pagada por completo
    const venta = db.prepare('SELECT total FROM ventas WHERE id = ?').get(data.venta_id) as
      | { total: number }
      | undefined;

    if (venta) {
      const pagado = totalPagado(data.venta_id);
      if (pagado >= venta.total) {
        db.prepare("UPDATE ventas SET estado = 'pagada' WHERE id = ?").run(data.venta_id);
      }
    }

    return Number(result.lastInsertRowid);
  });

  const pagoId = registrarPago();
  return findById(pagoId)!;
}

/** Saldo pendiente de una venta */
export function saldoPendiente(ventaId: number): number {
  const db = getDatabase();
  const venta = db.prepare('SELECT total FROM ventas WHERE id = ?').get(ventaId) as
    | { total: number }
    | undefined;

  if (!venta) return 0;
  return venta.total - totalPagado(ventaId);
}
