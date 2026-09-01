/**
 * REPOSITORY — Ventas
 *
 * Registrar ventas con detalle (productos y/o planes).
 * Al crear una venta:
 *  - Se descuenta stock de productos
 *  - Se crea suscripción si incluye plan
 *  - Se puede registrar pago inmediato o quedar pendiente
 */
import { query, withTransaction } from '../db/connection.js';
import { registrarMovimientoEfectivo } from './caja.repository.js';

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
  updated_at: string | null;
  updated_by: string | null;
  motivo_anulacion: string | null;
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

export async function findAll(filters?: {
  desde?: string;
  hasta?: string;
  estado?: string;
  tipo?: string;
}): Promise<VentaConCliente[]> {
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (filters?.desde) {
    params.push(filters.desde);
    conditions.push(`v.fecha >= $${params.length}`);
  }
  if (filters?.hasta) {
    params.push(filters.hasta + ' 23:59:59');
    conditions.push(`v.fecha <= $${params.length}`);
  }
  if (filters?.estado) {
    params.push(filters.estado);
    conditions.push(`v.estado = $${params.length}`);
  }
  if (filters?.tipo) {
    params.push(filters.tipo);
    conditions.push(`v.tipo = $${params.length}`);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const res = await query<VentaConCliente>(
    `${SELECT_VENTA} ${where} ORDER BY v.fecha DESC LIMIT 100`,
    params,
  );
  return res.rows;
}

export async function findById(id: number): Promise<VentaDetallada | undefined> {
  const ventaRes = await query<VentaConCliente>(`${SELECT_VENTA} WHERE v.id = $1`, [id]);
  const venta = ventaRes.rows[0];
  if (!venta) return undefined;

  const itemsRes = await query<VentaDetallada['items'][number]>(
    `SELECT dv.*,
        p.nombre as producto_nombre,
        pl.nombre as plan_nombre
      FROM detalle_venta dv
      LEFT JOIN productos p ON dv.producto_sku = p.sku
      LEFT JOIN planes pl ON dv.plan_id = pl.id
      WHERE dv.venta_id = $1`,
    [id],
  );

  const pagosRes = await query<VentaDetallada['pagos'][number]>(
    `SELECT pa.id, pa.monto, pa.fecha, mp.nombre as metodo_pago_nombre, pa.referencia
      FROM pagos pa
      JOIN metodos_pago mp ON pa.metodo_pago_id = mp.id
      WHERE pa.venta_id = $1
      ORDER BY pa.fecha`,
    [id],
  );

  const pagos = pagosRes.rows;
  const totalPagado = pagos.reduce((sum, p) => sum + p.monto, 0);

  return {
    ...venta,
    items: itemsRes.rows,
    pagos,
    total_pagado: totalPagado,
    saldo_pendiente: venta.total - totalPagado,
  };
}

export async function create(data: CreateVentaData): Promise<VentaDetallada> {
  const ventaId = await withTransaction(async (client) => {
    // Calcular totales
    let subtotal = 0;
    let iva = 0;

    // Obtener info de cada item para calcular IVA
    for (const item of data.items) {
      const itemSubtotal = item.precio_unitario * item.cantidad;
      subtotal += itemSubtotal;

      if (item.tipo_item === 'producto' && item.producto_sku) {
        const prodRes = await client.query<{ aplica_iva: number; porcentaje_iva: number }>(
          'SELECT aplica_iva, porcentaje_iva FROM productos WHERE sku = $1',
          [item.producto_sku],
        );
        const producto = prodRes.rows[0];
        if (producto?.aplica_iva) {
          iva += Math.round(itemSubtotal * (producto.porcentaje_iva / 100));
        }
      } else if (item.tipo_item === 'plan' && item.plan_id) {
        const planRes = await client.query<{ aplica_iva: number; porcentaje_iva: number }>(
          'SELECT aplica_iva, porcentaje_iva FROM planes WHERE id = $1',
          [item.plan_id],
        );
        const plan = planRes.rows[0];
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
    const ventaResult = await client.query<{ id: number }>(
      `INSERT INTO ventas (cliente_cedula, usuario_id, subtotal, iva, total, tipo, estado, notas, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
      [
        data.cliente_cedula || null,
        data.created_by || 'sistema',
        subtotal,
        iva,
        total,
        data.tipo,
        estado,
        data.notas || null,
        data.created_by || null,
      ],
    );

    const venta_id = ventaResult.rows[0]!.id;

    // Insertar detalle y descontar stock
    for (const item of data.items) {
      await client.query(
        `INSERT INTO detalle_venta (venta_id, tipo_item, producto_sku, plan_id, cantidad, precio_unitario, subtotal)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          venta_id,
          item.tipo_item,
          item.producto_sku || null,
          item.plan_id || null,
          item.cantidad,
          item.precio_unitario,
          item.precio_unitario * item.cantidad,
        ],
      );

      // Descontar stock si es producto
      if (item.tipo_item === 'producto' && item.producto_sku) {
        await client.query(
          'UPDATE productos SET stock_actual = stock_actual - $1, updated_at = now(), updated_by = $2 WHERE sku = $3',
          [item.cantidad, data.created_by || null, item.producto_sku],
        );
      }

      // Crear suscripción si es plan
      if (item.tipo_item === 'plan' && item.plan_id && data.cliente_cedula) {
        const planRes = await client.query<{ duracion_dias: number }>(
          'SELECT duracion_dias FROM planes WHERE id = $1',
          [item.plan_id],
        );
        const plan = planRes.rows[0];

        if (plan) {
          const fechaInicio = new Date().toISOString().split('T')[0];
          const fechaFin = new Date(Date.now() + plan.duracion_dias * 24 * 60 * 60 * 1000)
            .toISOString()
            .split('T')[0];

          await client.query(
            `INSERT INTO suscripciones (cliente_cedula, plan_id, venta_id, fecha_inicio, fecha_fin, monto_pagado, created_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              data.cliente_cedula,
              item.plan_id,
              venta_id,
              fechaInicio,
              fechaFin,
              item.precio_unitario * item.cantidad,
              data.created_by || null,
            ],
          );
        }
      }
    }

    // Registrar pago inmediato si se proporcionó
    if (data.pago_inmediato) {
      await client.query(
        `INSERT INTO pagos (venta_id, monto, metodo_pago_id, referencia, created_by)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          venta_id,
          data.pago_inmediato.monto,
          data.pago_inmediato.metodo_pago_id,
          data.pago_inmediato.referencia || null,
          data.created_by || null,
        ],
      );

      // Caja: si el pago inmediato fue en efectivo y hay sesión abierta, entra.
      await registrarMovimientoEfectivo(client, {
        metodo_pago_id: data.pago_inmediato.metodo_pago_id,
        tipo: 'ingreso',
        monto: data.pago_inmediato.monto,
        origen: 'venta',
        referencia_tipo: 'venta',
        referencia_id: venta_id,
        motivo: `Venta en efectivo #${venta_id}`,
        created_by: data.created_by,
      });
    }

    return venta_id;
  });

  return (await findById(ventaId))!;
}

export async function anular(id: number, updatedBy?: string, motivo?: string): Promise<boolean> {
  return withTransaction(async (client) => {
    const ventaRes = await client.query<{ estado: string }>(
      'SELECT estado FROM ventas WHERE id = $1',
      [id],
    );
    const venta = ventaRes.rows[0];
    if (!venta || venta.estado === 'anulada') return false;

    // Restaurar stock de productos
    const itemsRes = await client.query<{ producto_sku: string; cantidad: number }>(
      "SELECT producto_sku, cantidad FROM detalle_venta WHERE venta_id = $1 AND tipo_item = 'producto'",
      [id],
    );

    for (const item of itemsRes.rows) {
      await client.query(
        'UPDATE productos SET stock_actual = stock_actual + $1, updated_at = now(), updated_by = $2 WHERE sku = $3',
        [item.cantidad, updatedBy || null, item.producto_sku],
      );
    }

    // Cancelar suscripciones vinculadas
    await client.query("UPDATE suscripciones SET estado = 'cancelada' WHERE venta_id = $1", [id]);

    // Marcar venta como anulada, dejando registro de quién, cuándo y por qué
    await client.query(
      "UPDATE ventas SET estado = 'anulada', updated_at = now(), updated_by = $1, motivo_anulacion = $2 WHERE id = $3",
      [updatedBy || null, motivo || null, id],
    );

    return true;
  });
}
