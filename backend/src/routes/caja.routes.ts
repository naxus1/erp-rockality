import { Router, Request, Response } from 'express';
import * as repo from '../repositories/caja.repository.js';
import { validate } from '../middleware/validate.js';
import { registrarAudit } from '../middleware/audit.js';
import { requireRole } from '../middleware/auth.js';
import {
  abrirSesionSchema,
  movimientoManualSchema,
  cerrarSesionSchema,
} from '../schemas/caja.schema.js';

const router = Router();

// Todas las operaciones de caja son solo para admin (manejo de efectivo).
router.use(requireRole('admin'));

/**
 * Arma el estado completo de una sesión: la sesión + saldo esperado + resumen
 * por tipo + movimientos. Se reutiliza en varias respuestas.
 */
function estadoSesion(sesionId: number) {
  const sesion = repo.findSesionById(sesionId);
  if (!sesion) return null;
  return {
    sesion,
    saldo_esperado: repo.saldoEsperado(sesionId),
    resumen: repo.resumenSesion(sesionId),
    movimientos: repo.listarMovimientos(sesionId),
  };
}

// GET /api/caja — Estado actual (sesión abierta con su detalle, o null)
router.get('/', (_req: Request, res: Response) => {
  const abierta = repo.sesionAbierta();
  res.json({
    success: true,
    data: abierta ? estadoSesion(abierta.id) : null,
  });
});

// GET /api/caja/sesiones — Historial de sesiones
router.get('/sesiones', (_req: Request, res: Response) => {
  res.json({ success: true, data: repo.listarSesiones() });
});

// GET /api/caja/sesiones/:id — Detalle de una sesión (con arqueo y movimientos)
router.get('/sesiones/:id', (req: Request, res: Response) => {
  const estado = estadoSesion(Number(req.params.id));
  if (!estado) {
    res.status(404).json({ success: false, error: 'Sesión de caja no encontrada' });
    return;
  }
  res.json({ success: true, data: estado });
});

// POST /api/caja/abrir — Abrir una nueva sesión de caja
router.post('/abrir', validate(abrirSesionSchema), (req: Request, res: Response) => {
  const usuarioId = req.user?.username || 'sistema';
  try {
    const sesion = repo.abrirSesion({ ...req.body, abierta_por: usuarioId });
    registrarAudit({
      usuario_id: usuarioId,
      accion: 'crear',
      entidad: 'caja_sesiones',
      entidad_id: String(sesion.id),
      datos_nuevos: { saldo_inicial: sesion.saldo_inicial },
    });
    res.status(201).json({ success: true, data: estadoSesion(sesion.id) });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error al abrir la caja',
    });
  }
});

// POST /api/caja/movimientos — Registrar movimiento manual (retiro/ingreso/ajuste/egreso)
router.post('/movimientos', validate(movimientoManualSchema), (req: Request, res: Response) => {
  const usuarioId = req.user?.username || 'sistema';
  const sesion = repo.sesionAbierta();
  if (!sesion) {
    res.status(400).json({ success: false, error: 'No hay una sesión de caja abierta' });
    return;
  }

  const mov = repo.registrarMovimiento({
    tipo: req.body.tipo,
    monto: req.body.monto,
    origen: 'manual',
    motivo: req.body.motivo,
    created_by: usuarioId,
  });

  registrarAudit({
    usuario_id: usuarioId,
    accion: 'crear',
    entidad: 'caja_movimientos',
    entidad_id: mov ? String(mov.id) : '',
    datos_nuevos: { tipo: req.body.tipo, monto: req.body.monto, motivo: req.body.motivo },
  });

  res.status(201).json({ success: true, data: estadoSesion(sesion.id) });
});

// POST /api/caja/cerrar — Cerrar la sesión abierta con arqueo
router.post('/cerrar', validate(cerrarSesionSchema), (req: Request, res: Response) => {
  const usuarioId = req.user?.username || 'sistema';
  try {
    const sesion = repo.cerrarSesion({ ...req.body, cerrada_por: usuarioId });
    registrarAudit({
      usuario_id: usuarioId,
      accion: 'editar',
      entidad: 'caja_sesiones',
      entidad_id: String(sesion.id),
      datos_nuevos: {
        estado: 'cerrada',
        saldo_esperado: sesion.saldo_esperado,
        saldo_contado: sesion.saldo_contado,
        diferencia: sesion.diferencia,
      },
    });
    res.json({ success: true, data: estadoSesion(sesion.id) });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error al cerrar la caja',
    });
  }
});

export default router;
