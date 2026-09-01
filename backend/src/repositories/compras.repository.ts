/**
 * REPOSITORY — Compras (entradas de inventario)
 *
 * Al registrar una compra:
 *  1. Se crea el registro de compra con detalle
 *  2. Se suma stock de cada producto
 *  3. Se genera un gasto automático vinculado
 */
import { query, withTransaction } from '../db/connection.js';
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

export async function findAll(filters?: {
  desde?: string;
  hasta?: string;
}): Promise<CompraConProveedor[]> {
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (filters?.desde) {
    params.push(filters.desde);
    conditions.push(`c.fecha >= $${params.length}`);
  }
  if (filters?.hasta) {
    params.push(filters.hasta);
    conditions.push(`c.fecha <= $${params.length}`);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const res = await query<CompraConProveedor>(
    `${SELECT_COMPRA} ${where} ORDER BY c.fecha DESC LIMIT 100`,
    params,
  );
  return res.rows;
}

export async function findById(id: number): Promise<CompraDetallada | undefined> {
  const compraRes = await query<CompraConProveedor>(`${SELECT_COMPRA} WHERE c.id = $1`, [id]);
  const compra = compraRes.rows[0];
  if (!compra) return undefined;

  const itemsRes = await query<CompraDetallada['items'][number]>(
    `SELECT dc.*, p.nombre as producto_nombre
       FROM detalle_compra dc
       JOIN productos p ON dc.producto_sku = p.sku
       WHERE dc.compra_id = $1`,
    [id],
  );

  return { ...compra, items: itemsRes.rows };
}

export async function create(data: CreateCompraData): Promise<CompraDetallada> {
  const compraId = await withTransaction(async (client) => {
    // Calcular subtotal
    const subtotal = data.items.reduce(
      (sum, item) => sum + item.precio_unitario * item.cantidad,
      0,
    );
    const iva = data.iva ?? 0;
    const total = subtotal + iva;

    // 1. Crear gasto automático
    const gastoResult = await client.query<{ id: number }>(
      `INSERT INTO gastos (tercero_nit, gerencia_id, tipo_gasto_id, categoria_gasto_id, descripcion, valor_base, iva, total, periodo_mes, periodo_anio, fecha_pago, metodo_pago_id, referencia_pago, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING id`,
      [
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
      ],
    );

    const gastoId = gastoResult.rows[0]!.id;

    // Caja: si la compra se pagó en efectivo y hay sesión abierta, sale de la caja.
    await registrarMovimientoEfectivo(client, {
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
    const compraResult = await client.query<{ id: number }>(
      `INSERT INTO compras (tercero_nit, fecha, factura_proveedor, subtotal, iva, total, gasto_id, notas, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
      [
        data.tercero_nit,
        data.fecha || new Date().toISOString().split('T')[0],
        data.factura_proveedor || null,
        subtotal,
        iva,
        total,
        gastoId,
        data.notas || null,
        data.created_by || null,
      ],
    );

    const compra_id = compraResult.rows[0]!.id;

    // 3. Insertar detalle y sumar stock
    for (const item of data.items) {
      await client.query(
        `INSERT INTO detalle_compra (compra_id, producto_sku, cantidad, precio_unitario, subtotal)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          compra_id,
          item.producto_sku,
          item.cantidad,
          item.precio_unitario,
          item.precio_unitario * item.cantidad,
        ],
      );

      // Sumar stock
      await client.query(
        'UPDATE productos SET stock_actual = stock_actual + $1, updated_at = now(), updated_by = $2 WHERE sku = $3',
        [item.cantidad, data.created_by || null, item.producto_sku],
      );
    }

    return compra_id;
  });

  return (await findById(compraId))!;
}

export async function anular(id: number, updatedBy?: string): Promise<boolean> {
  return withTransaction(async (client) => {
    const compraRes = await client.query<{ estado: string; gasto_id: number | null }>(
      'SELECT estado, gasto_id FROM compras WHERE id = $1',
      [id],
    );
    const compra = compraRes.rows[0];
    if (!compra || compra.estado === 'anulada') return false;

    // Restar stock
    const itemsRes = await client.query<{ producto_sku: string; cantidad: number }>(
      'SELECT producto_sku, cantidad FROM detalle_compra WHERE compra_id = $1',
      [id],
    );
    for (const item of itemsRes.rows) {
      await client.query(
        'UPDATE productos SET stock_actual = stock_actual - $1, updated_at = now(), updated_by = $2 WHERE sku = $3',
        [item.cantidad, updatedBy || null, item.producto_sku],
      );
    }

    // Anular gasto asociado
    if (compra.gasto_id) {
      await client.query("UPDATE gastos SET estado = 'anulado' WHERE id = $1", [compra.gasto_id]);
    }

    // Anular compra
    await client.query("UPDATE compras SET estado = 'anulada' WHERE id = $1", [id]);
    return true;
  });
}
