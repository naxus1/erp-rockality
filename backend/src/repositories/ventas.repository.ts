/**
 * REPOSITORY — Ventas
 *
 * Registrar ventas con detalle (productos y/o planes).
 * Al crear una venta:
 *  - Se descuenta stock de productos
 *  - Se crea suscripción si incluye plan
 *  - Se puede registrar pago inmediato o quedar pendiente
 */
import { getDatabase } from '../db/connection.js';

export interface Venta {
  id: number;
  cliente_cedula: string | null;
  usuario_id: string;
  fecha: string;
  subtotal: number;
  iva: number;
  total: number;
  tipo: string;
  estado: string;
  notas: string | null;
  created_at: string;
  created_by: string | null;
}

export interface VentaConCliente extends Venta {
  cliente_nombre: string | null;
  cliente_apellidos: string | null;
}

export interface DetalleVentaItem {
  tipo_item: 'producto' | 'plan';
  producto_sku?: string;
  plan_id?: number;
  cantidad: number;
  precio_unitario: number;
}

export interface CreateVentaData {
  cliente_cedula?: string;
  tipo: 'nueva' | 'recompra' | 'historico';
  items: DetalleVentaItem[];
  notas?: string;
  created_by?: string;
  // Pago inmediato (opcional)
  pago_inmediato?: {
    monto: number;
    metodo_pago_id: number;
    referencia?: string;
  };
}

export interface VentaDetallada extends VentaConCliente {
  items: Array<{
    id: number;
    tipo_item: string;
    producto_sku: string | null;
    plan_id: number | null;
    cantidad: number;
    precio_unitario: number;
    subtotal: number;
    producto_nombre: string | null;
    plan_nombre: string | null;
  }>;
  pagos: Array<{
    id: number;
    monto: number;
    fecha: string;
    metodo_pago_nombre: string;
    referencia: string | null;
  }>;
  total_pagado: number;
  saldo_pendiente: number;
}

const SELECT_VENTA = `
  SELECT v.*,
    c.nombre as cliente_nombre,
    c.apellidos as cliente_apellidos
  FROM ventas v
  LEFT JOIN clientes c ON v.cliente_cedula = c.cedula
`;

export function findAll(filters?: {
  desde?: string;
  hasta?: string;
  estado?: string;
  tipo?: string;
}): VentaConCliente[] {
  const db = getDatabase();
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (filters?.desde) {
    conditions.push('v.fecha >= ?');
    params.push(filters.desde);
  }
  if (filters?.hasta) {
    conditions.push('v.fecha <= ?');
    params.push(filters.hasta + ' 23:59:59');
  }
  if (filters?.estado) {
    conditions.push('v.estado = ?');
    params.push(filters.estado);
  }
  if (filters?.tipo) {
    conditions.push('v.tipo = ?');
    params.push(filters.tipo);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  return db
    .prepare(`${SELECT_VENTA} ${where} ORDER BY v.fecha DESC LIMIT 100`)
    .all(...params) as VentaConCliente[];
}

export function findById(id: number): VentaDetallada | undefined {
  const db = getDatabase();

  const venta = db.prepare(`${SELECT_VENTA} WHERE v.id = ?`).get(id) as VentaConCliente | undefined;
  if (!venta) return undefined;

  const items = db
    .prepare(
      `SELECT dv.*,
        p.nombre as producto_nombre,
        pl.nombre as plan_nombre
      FROM detalle_venta dv
      LEFT JOIN productos p ON dv.producto_sku = p.sku
      LEFT JOIN planes pl ON dv.plan_id = pl.id
      WHERE dv.venta_id = ?`,
    )
    .all(id) as VentaDetallada['items'];

  const pagos = db
    .prepare(
      `SELECT pa.id, pa.monto, pa.fecha, mp.nombre as metodo_pago_nombre, pa.referencia
      FROM pagos pa
      JOIN metodos_pago mp ON pa.metodo_pago_id = mp.id
      WHERE pa.venta_id = ?
      ORDER BY pa.fecha`,
    )
    .all(id) as VentaDetallada['pagos'];

  const totalPagado = pagos.reduce((sum, p) => sum + p.monto, 0);

  return {
    ...venta,
    items,
    pagos,
    total_pagado: totalPagado,
    saldo_pendiente: venta.total - totalPagado,
  };
}

export function create(data: CreateVentaData): VentaDetallada {
  const db = getDatabase();

  const crearVenta = db.transaction(() => {
    // Calcular totales
    let subtotal = 0;
    let iva = 0;

    // Obtener info de cada item para calcular IVA
    for (const item of data.items) {
      const itemSubtotal = item.precio_unitario * item.cantidad;
      subtotal += itemSubtotal;

      if (item.tipo_item === 'producto' && item.producto_sku) {
        const producto = db
          .prepare('SELECT aplica_iva, porcentaje_iva FROM productos WHERE sku = ?')
          .get(item.producto_sku) as { aplica_iva: number; porcentaje_iva: number } | undefined;
        if (producto?.aplica_iva) {
          iva += Math.round(itemSubtotal * (producto.porcentaje_iva / 100));
        }
      } else if (item.tipo_item === 'plan' && item.plan_id) {
        const plan = db
          .prepare('SELECT aplica_iva, porcentaje_iva FROM planes WHERE id = ?')
          .get(item.plan_id) as { aplica_iva: number; porcentaje_iva: number } | undefined;
        if (plan?.aplica_iva) {
          iva += Math.round(itemSubtotal * (plan.porcentaje_iva / 100));
        }
      }
    }

    const total = subtotal + iva;

    // Determinar estado
    let estado = 'pendiente';
    if (data.pago_inmediato && data.pago_inmediato.monto >= total) {
      estado = 'pagada';
    }

    // Insertar venta
    const ventaResult = db
      .prepare(
        `INSERT INTO ventas (cliente_cedula, usuario_id, subtotal, iva, total, tipo, estado, notas, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        data.cliente_cedula || null,
        data.created_by || 'sistema',
        subtotal,
        iva,
        total,
        data.tipo,
        estado,
        data.notas || null,
        data.created_by || null,
      );

    const ventaId = Number(ventaResult.lastInsertRowid);

    // Insertar detalle y descontar stock
    for (const item of data.items) {
      db.prepare(
        `INSERT INTO detalle_venta (venta_id, tipo_item, producto_sku, plan_id, cantidad, precio_unitario, subtotal)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        ventaId,
        item.tipo_item,
        item.producto_sku || null,
        item.plan_id || null,
        item.cantidad,
        item.precio_unitario,
        item.precio_unitario * item.cantidad,
      );

      // Descontar stock si es producto
      if (item.tipo_item === 'producto' && item.producto_sku) {
        db.prepare(
          "UPDATE productos SET stock_actual = stock_actual - ?, updated_at = datetime('now'), updated_by = ? WHERE sku = ?",
        ).run(item.cantidad, data.created_by || null, item.producto_sku);
      }

      // Crear suscripción si es plan
      if (item.tipo_item === 'plan' && item.plan_id && data.cliente_cedula) {
        const plan = db
          .prepare('SELECT duracion_dias FROM planes WHERE id = ?')
          .get(item.plan_id) as { duracion_dias: number } | undefined;

        if (plan) {
          const fechaInicio = new Date().toISOString().split('T')[0];
          const fechaFin = new Date(Date.now() + plan.duracion_dias * 24 * 60 * 60 * 1000)
            .toISOString()
            .split('T')[0];

          db.prepare(
            `INSERT INTO suscripciones (cliente_cedula, plan_id, venta_id, fecha_inicio, fecha_fin, monto_pagado, created_by)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
          ).run(
            data.cliente_cedula,
            item.plan_id,
            ventaId,
            fechaInicio,
            fechaFin,
            item.precio_unitario * item.cantidad,
            data.created_by || null,
          );
        }
      }
    }

    // Registrar pago inmediato si se proporcionó
    if (data.pago_inmediato) {
      db.prepare(
        `INSERT INTO pagos (venta_id, monto, metodo_pago_id, referencia, created_by)
         VALUES (?, ?, ?, ?, ?)`,
      ).run(
        ventaId,
        data.pago_inmediato.monto,
        data.pago_inmediato.metodo_pago_id,
        data.pago_inmediato.referencia || null,
        data.created_by || null,
      );
    }

    return ventaId;
  });

  const ventaId = crearVenta();
  return findById(ventaId)!;
}

export function anular(id: number, updatedBy?: string): boolean {
  const db = getDatabase();

  const anularVenta = db.transaction(() => {
    const venta = db.prepare('SELECT estado FROM ventas WHERE id = ?').get(id) as
      | { estado: string }
      | undefined;
    if (!venta || venta.estado === 'anulada') return false;

    // Restaurar stock de productos
    const items = db
      .prepare(
        "SELECT producto_sku, cantidad FROM detalle_venta WHERE venta_id = ? AND tipo_item = 'producto'",
      )
      .all(id) as Array<{ producto_sku: string; cantidad: number }>;

    for (const item of items) {
      db.prepare(
        "UPDATE productos SET stock_actual = stock_actual + ?, updated_at = datetime('now'), updated_by = ? WHERE sku = ?",
      ).run(item.cantidad, updatedBy || null, item.producto_sku);
    }

    // Cancelar suscripciones vinculadas
    db.prepare("UPDATE suscripciones SET estado = 'cancelada' WHERE venta_id = ?").run(id);

    // Marcar venta como anulada
    db.prepare("UPDATE ventas SET estado = 'anulada' WHERE id = ?").run(id);

    return true;
  });

  return anularVenta();
}
