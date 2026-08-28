/**
 * ROUTES — Reportes / Dashboard KPIs
 */
import { Router, Request, Response } from 'express';
import { getDatabase } from '../db/connection.js';
import * as caja from '../repositories/caja.repository.js';

const router = Router();

// GET /api/reportes/dashboard — KPIs principales
router.get('/dashboard', (_req: Request, res: Response) => {
  const db = getDatabase();
  const mes = new Date().getMonth() + 1;
  const anio = new Date().getFullYear();

  // Ventas del mes
  const ventasMes = db
    .prepare(
      "SELECT COALESCE(SUM(total), 0) as total, COUNT(*) as count FROM ventas WHERE estado != 'anulada' AND strftime('%m', fecha) = ? AND strftime('%Y', fecha) = ?",
    )
    .get(String(mes).padStart(2, '0'), String(anio)) as { total: number; count: number };

  // Gastos del mes
  const gastosMes = db
    .prepare(
      "SELECT COALESCE(SUM(total), 0) as total, COUNT(*) as count FROM gastos WHERE estado != 'anulado' AND periodo_mes = ? AND periodo_anio = ?",
    )
    .get(mes, anio) as { total: number; count: number };

  // Margen
  const margen = ventasMes.total - gastosMes.total;

  // Suscripciones activas
  const suscActivas = db
    .prepare("SELECT COUNT(*) as count FROM suscripciones WHERE estado = 'activa'")
    .get() as { count: number };

  // Por vencer (7 días) — contador
  const porVencer = db
    .prepare(
      "SELECT COUNT(*) as count FROM suscripciones WHERE estado = 'activa' AND julianday(fecha_fin) - julianday('now') BETWEEN 0 AND 7",
    )
    .get() as { count: number };

  // Por vencer (7 días) — detalle (quiénes, qué plan, cuándo vence)
  const porVencerDetalle = db
    .prepare(
      `SELECT s.id, s.cliente_cedula, c.nombre, c.apellidos, p.nombre as plan_nombre,
         s.fecha_fin,
         CAST(julianday(s.fecha_fin) - julianday('now') AS INTEGER) as dias_restantes
       FROM suscripciones s
       LEFT JOIN clientes c ON s.cliente_cedula = c.cedula
       LEFT JOIN planes p ON s.plan_id = p.id
       WHERE s.estado = 'activa' AND julianday(s.fecha_fin) - julianday('now') BETWEEN 0 AND 7
       ORDER BY s.fecha_fin ASC`,
    )
    .all() as Array<{
    id: number;
    cliente_cedula: string | null;
    nombre: string | null;
    apellidos: string | null;
    plan_nombre: string | null;
    fecha_fin: string;
    dias_restantes: number;
  }>;

  // Clientes nuevos este mes
  const clientesNuevos = db
    .prepare(
      "SELECT COUNT(*) as count FROM clientes WHERE strftime('%m', created_at) = ? AND strftime('%Y', created_at) = ?",
    )
    .get(String(mes).padStart(2, '0'), String(anio)) as { count: number };

  // Ventas pendientes (por cobrar)
  const pendientes = db
    .prepare(
      "SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as total FROM ventas WHERE estado = 'pendiente'",
    )
    .get() as { count: number; total: number };

  // Pagado pendientes
  const pagadoPendientes = db
    .prepare(
      "SELECT COALESCE(SUM(p.monto), 0) as total FROM pagos p JOIN ventas v ON p.venta_id = v.id WHERE v.estado = 'pendiente'",
    )
    .get() as { total: number };

  const saldoPendienteTotal = pendientes.total - pagadoPendientes.total;

  // Detalle de quién debe
  const deudores = db
    .prepare(
      `SELECT v.id, v.total, c.nombre, c.apellidos, c.cedula,
         COALESCE((SELECT SUM(monto) FROM pagos WHERE venta_id = v.id), 0) as pagado
       FROM ventas v
       LEFT JOIN clientes c ON v.cliente_cedula = c.cedula
       WHERE v.estado = 'pendiente'
       ORDER BY v.fecha DESC`,
    )
    .all() as Array<{
    id: number;
    total: number;
    nombre: string | null;
    apellidos: string | null;
    cedula: string | null;
    pagado: number;
  }>;

  // Stock bajo
  const stockBajo = db
    .prepare(
      'SELECT COUNT(*) as count FROM productos WHERE activo = 1 AND stock_actual <= stock_minimo',
    )
    .get() as { count: number };

  // Ticket promedio
  const ticketPromedio = ventasMes.count > 0 ? Math.round(ventasMes.total / ventasMes.count) : 0;

  res.json({
    success: true,
    data: {
      ventas_mes: { total: ventasMes.total, count: ventasMes.count },
      gastos_mes: { total: gastosMes.total, count: gastosMes.count },
      margen,
      suscripciones_activas: suscActivas.count,
      suscripciones_por_vencer: porVencer.count,
      suscripciones_por_vencer_detalle: porVencerDetalle.map((s) => ({
        id: s.id,
        cliente: s.nombre ? `${s.nombre} ${s.apellidos}` : 'Sin cliente',
        plan: s.plan_nombre || '-',
        fecha_fin: s.fecha_fin,
        dias_restantes: s.dias_restantes,
      })),
      clientes_nuevos_mes: clientesNuevos.count,
      ventas_pendientes: {
        count: pendientes.count,
        saldo: saldoPendienteTotal,
        deudores: deudores.map((d) => ({
          venta_id: d.id,
          cliente: d.nombre ? `${d.nombre} ${d.apellidos}` : 'Sin cliente',
          cedula: d.cedula,
          saldo: d.total - d.pagado,
        })),
      },
      stock_bajo: stockBajo.count,
      ticket_promedio: ticketPromedio,
    },
  });
});

// GET /api/reportes/conciliacion?desde=YYYY-MM-DD&hasta=YYYY-MM-DD
// Concilia el dinero recibido: desglosa los pagos por método (efectivo vs
// digital) en un rango de fechas, y muestra el saldo de caja (efectivo) actual.
// Sirve para cuadrar lo digital contra el banco y ver el efectivo disponible.
router.get('/conciliacion', (req: Request, res: Response) => {
  const db = getDatabase();

  // Rango: por defecto el mes actual
  const hoy = new Date();
  const primerDia = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().split('T')[0];
  const desde = typeof req.query.desde === 'string' ? req.query.desde : primerDia;
  const hasta =
    typeof req.query.hasta === 'string' ? req.query.hasta : hoy.toISOString().split('T')[0];

  // Pagos por método de pago en el rango (solo de ventas no anuladas)
  const porMetodo = db
    .prepare(
      `SELECT mp.id, mp.nombre,
         COALESCE(SUM(p.monto), 0) as total,
         COUNT(p.id) as count
       FROM metodos_pago mp
       LEFT JOIN pagos p ON p.metodo_pago_id = mp.id
         AND date(p.fecha) BETWEEN date(?) AND date(?)
         AND EXISTS (SELECT 1 FROM ventas v WHERE v.id = p.venta_id AND v.estado != 'anulada')
       GROUP BY mp.id, mp.nombre
       ORDER BY total DESC`,
    )
    .all(desde, hasta) as Array<{ id: number; nombre: string; total: number; count: number }>;

  const totalRecibido = porMetodo.reduce((sum, m) => sum + m.total, 0);
  const totalEfectivo = porMetodo
    .filter((m) => m.nombre.trim().toLowerCase() === 'efectivo')
    .reduce((sum, m) => sum + m.total, 0);
  const totalDigital = totalRecibido - totalEfectivo;

  // Estado de la caja de efectivo
  const sesion = caja.sesionAbierta();
  const cajaEstado = sesion
    ? {
        abierta: true,
        sesion_id: sesion.id,
        saldo_inicial: sesion.saldo_inicial,
        saldo_actual: caja.saldoEsperado(sesion.id),
        resumen: caja.resumenSesion(sesion.id),
      }
    : { abierta: false };

  res.json({
    success: true,
    data: {
      rango: { desde, hasta },
      pagos_por_metodo: porMetodo,
      total_recibido: totalRecibido,
      total_efectivo: totalEfectivo,
      total_digital: totalDigital,
      caja: cajaEstado,
    },
  });
});

export default router;
