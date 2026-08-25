/**
 * ROUTES — Reportes / Dashboard KPIs
 */
import { Router, Request, Response } from 'express';
import { getDatabase } from '../db/connection.js';

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

  // Por vencer (7 días)
  const porVencer = db
    .prepare(
      "SELECT COUNT(*) as count FROM suscripciones WHERE estado = 'activa' AND julianday(fecha_fin) - julianday('now') BETWEEN 0 AND 7",
    )
    .get() as { count: number };

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

export default router;
