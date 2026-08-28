/**
 * REPOSITORY — Compras (entradas de inventario)
 *
 * Al registrar una compra:
 *  1. Se crea el registro de compra con detalle
 *  2. Se suma stock de cada producto
 *  3. Se genera un gasto automático vinculado
 */
import { getDatabase } from '../db/connection.js';
import { registrarMovimientoEfectivo } from './caja.repository.js';

export interface Compra {
  id: number;
  tercero_nit: string;
  fecha: string;
  factura_proveedor: string | null;
  subtotal: number;
  iva: number;
  total: number;
  gasto_id: number | null;
  estado: string;
  notas: string | null;
  created_at: string;
  created_by: string | null;
}

export interface CompraConProveedor extends Compra {
  tercero_nombre: string;
}

export interface DetalleCompraItem {
  producto_sku: string;
  cantidad: number;
  precio_unitario: number;
}

export interface CreateCompraData {
  tercero_nit: string;
  fecha?: string;
  factura_proveedor?: string;
  items: DetalleCompraItem[];
  iva?: number;
  gerencia_id?: number;
  tipo_gasto_id?: number;
  categoria_gasto_id?: number;
  metodo_pago_id?: number;
  notas?: string;
  created_by?: string;
}

export interface CompraDetallada extends CompraConProveedor {
  items: Array<{
    id: number;
    producto_sku: string;
    producto_nombre: string;
    cantidad: number;
    precio_unitario: number;
    subtotal: number;
  }>;
}

const SELECT_COMPRA = `
  SELECT c.*, t.nombre as tercero_nombre
  FROM compras c
  JOIN terceros t ON c.tercero_nit = t.nit
`;

export function findAll(filters?: { desde?: string; hasta?: string }): CompraConProveedor[] {
  const db = getDatabase();
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (filters?.desde) {
    conditions.push('c.fecha >= ?');
    params.push(filters.desde);
  }
  if (filters?.hasta) {
    conditions.push('c.fecha <= ?');
    params.push(filters.hasta);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  return db
    .prepare(`${SELECT_COMPRA} ${where} ORDER BY c.fecha DESC LIMIT 100`)
    .all(...params) as CompraConProveedor[];
}

export function findById(id: number): CompraDetallada | undefined {
  const db = getDatabase();

  const compra = db.prepare(`${SELECT_COMPRA} WHERE c.id = ?`).get(id) as
    | CompraConProveedor
    | undefined;
  if (!compra) return undefined;

  const items = db
    .prepare(
      `SELECT dc.*, p.nombre as producto_nombre
       FROM detalle_compra dc
       JOIN productos p ON dc.producto_sku = p.sku
       WHERE dc.compra_id = ?`,
    )
    .all(id) as CompraDetallada['items'];

  return { ...compra, items };
}

export function create(data: CreateCompraData): CompraDetallada {
  const db = getDatabase();

  const crearCompra = db.transaction(() => {
    // Calcular subtotal
    const subtotal = data.items.reduce(
      (sum, item) => sum + item.precio_unitario * item.cantidad,
      0,
    );
    const iva = data.iva ?? 0;
    const total = subtotal + iva;

    // 1. Crear gasto automático
    const gastoResult = db
      .prepare(
        `INSERT INTO gastos (tercero_nit, gerencia_id, tipo_gasto_id, categoria_gasto_id, descripcion, valor_base, iva, total, periodo_mes, periodo_anio, fecha_pago, metodo_pago_id, referencia_pago, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        data.tercero_nit,
        data.gerencia_id || 2, // Default: Administrativa
        data.tipo_gasto_id || 2, // Default: Gastos generales
        data.categoria_gasto_id || 3, // Default: Insumos
        `Compra inventario - ${data.items.map((i) => i.producto_sku).join(', ')}`,
        subtotal,
        iva,
        total,
        new Date().getMonth() + 1,
        new Date().getFullYear(),
        data.fecha || new Date().toISOString().split('T')[0],
        data.metodo_pago_id || null,
        data.factura_proveedor || null,
        data.created_by || null,
      );

    const gastoId = Number(gastoResult.lastInsertRowid);

    // Caja: si la compra se pagó en efectivo y hay sesión abierta, sale de la caja.
    registrarMovimientoEfectivo(db, {
      metodo_pago_id: data.metodo_pago_id,
      tipo: 'egreso',
      monto: total,
      origen: 'compra',
      referencia_tipo: 'gasto',
      referencia_id: gastoId,
      motivo: `Compra en efectivo (gasto #${gastoId})`,
      created_by: data.created_by,
    });

    // 2. Crear compra
    const compraResult = db
      .prepare(
        `INSERT INTO compras (tercero_nit, fecha, factura_proveedor, subtotal, iva, total, gasto_id, notas, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        data.tercero_nit,
        data.fecha || new Date().toISOString().split('T')[0],
        data.factura_proveedor || null,
        subtotal,
        iva,
        total,
        gastoId,
        data.notas || null,
        data.created_by || null,
      );

    const compraId = Number(compraResult.lastInsertRowid);

    // 3. Insertar detalle y sumar stock
    for (const item of data.items) {
      db.prepare(
        `INSERT INTO detalle_compra (compra_id, producto_sku, cantidad, precio_unitario, subtotal)
         VALUES (?, ?, ?, ?, ?)`,
      ).run(
        compraId,
        item.producto_sku,
        item.cantidad,
        item.precio_unitario,
        item.precio_unitario * item.cantidad,
      );

      // Sumar stock
      db.prepare(
        "UPDATE productos SET stock_actual = stock_actual + ?, updated_at = datetime('now'), updated_by = ? WHERE sku = ?",
      ).run(item.cantidad, data.created_by || null, item.producto_sku);
    }

    return compraId;
  });

  const compraId = crearCompra();
  return findById(compraId)!;
}

export function anular(id: number, updatedBy?: string): boolean {
  const db = getDatabase();

  const anularCompra = db.transaction(() => {
    const compra = db.prepare('SELECT estado, gasto_id FROM compras WHERE id = ?').get(id) as
      | { estado: string; gasto_id: number | null }
      | undefined;
    if (!compra || compra.estado === 'anulada') return false;

    // Restar stock
    const items = db
      .prepare('SELECT producto_sku, cantidad FROM detalle_compra WHERE compra_id = ?')
      .all(id) as Array<{ producto_sku: string; cantidad: number }>;
    for (const item of items) {
      db.prepare(
        "UPDATE productos SET stock_actual = stock_actual - ?, updated_at = datetime('now'), updated_by = ? WHERE sku = ?",
      ).run(item.cantidad, updatedBy || null, item.producto_sku);
    }

    // Anular gasto asociado
    if (compra.gasto_id) {
      db.prepare("UPDATE gastos SET estado = 'anulado' WHERE id = ?").run(compra.gasto_id);
    }

    // Anular compra
    db.prepare("UPDATE compras SET estado = 'anulada' WHERE id = ?").run(id);
    return true;
  });

  return anularCompra();
}
