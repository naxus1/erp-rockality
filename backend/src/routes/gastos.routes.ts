import { Router, Request, Response } from 'express';
import * as repo from '../repositories/gastos.repository.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/async-handler.js';
import { registrarAudit } from '../middleware/audit.js';
import { createGastoSchema, updateGastoSchema } from '../schemas/gastos.schema.js';
import { toUpper } from '../schemas/text.js';

const router = Router();

// GET /api/gastos — Listar con filtros
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const gastos = await repo.findAll({
      periodo_mes: req.query.periodo_mes ? Number(req.query.periodo_mes) : undefined,
      periodo_anio: req.query.periodo_anio ? Number(req.query.periodo_anio) : undefined,
      gerencia_id: req.query.gerencia_id ? Number(req.query.gerencia_id) : undefined,
      tipo_gasto_id: req.query.tipo_gasto_id ? Number(req.query.tipo_gasto_id) : undefined,
    });
    res.json({ success: true, data: gastos });
  }),
);

// GET /api/gastos/resumen?mes=8&anio=2026 — Total del periodo
router.get(
  '/resumen',
  asyncHandler(async (req: Request, res: Response) => {
    const mes = Number(req.query.mes);
    const anio = Number(req.query.anio);
    if (!mes || !anio) {
      res.status(400).json({ success: false, error: 'Parámetros mes y anio son obligatorios' });
      return;
    }
    const resumen = await repo.totalPorPeriodo(mes, anio);
    res.json({ success: true, data: resumen });
  }),
);

// GET /api/gastos/:id
router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const gasto = await repo.findById(Number(req.params.id));
    if (!gasto) {
      res.status(404).json({ success: false, error: 'Gasto no encontrado' });
      return;
    }
    res.json({ success: true, data: gasto });
  }),
);

// POST /api/gastos
router.post(
  '/',
  validate(createGastoSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const usuarioId = req.user?.username || 'sistema';
    const gasto = await repo.create({ ...req.body, created_by: usuarioId });
    await registrarAudit({
      usuario_id: usuarioId,
      accion: 'crear',
      entidad: 'gastos',
      entidad_id: String(gasto.id),
      datos_nuevos: { total: gasto.total, descripcion: gasto.descripcion },
    });
    res.status(201).json({ success: true, data: gasto });
  }),
);

// PUT /api/gastos/:id — Edición limitada (solo descripción, notas, referencia)
router.put(
  '/:id',
  validate(updateGastoSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const usuarioId = req.user?.username || 'sistema';
    const gasto = await repo.update(Number(req.params.id), { ...req.body, updated_by: usuarioId });
    if (!gasto) {
      res
        .status(400)
        .json({ success: false, error: 'Gasto no encontrado o anulado (no se puede editar)' });
      return;
    }
    await registrarAudit({
      usuario_id: usuarioId,
      accion: 'editar',
      entidad: 'gastos',
      entidad_id: String(req.params.id),
      datos_nuevos: {
        descripcion: gasto.descripcion,
        referencia_pago: gasto.referencia_pago,
        notas: gasto.notas,
      },
    });
    res.json({ success: true, data: gasto });
  }),
);

// POST /api/gastos/:id/anular — Anular gasto con motivo obligatorio
router.post(
  '/:id/anular',
  asyncHandler(async (req: Request, res: Response) => {
    const motivo = typeof req.body.motivo === 'string' ? toUpper(req.body.motivo) : '';
    if (!motivo) {
      res.status(400).json({ success: false, error: 'El motivo de anulación es obligatorio' });
      return;
    }
    const usuarioId = req.user?.username || 'sistema';

    const result = await repo.anular(Number(req.params.id), usuarioId, motivo);
    if (!result) {
      res.status(400).json({ success: false, error: 'Gasto no encontrado o ya anulado' });
      return;
    }
    await registrarAudit({
      usuario_id: usuarioId,
      accion: 'anular',
      entidad: 'gastos',
      entidad_id: String(req.params.id),
      datos_anteriores: { estado: 'registrado' },
      datos_nuevos: { estado: 'anulado', motivo },
    });
    res.json({ success: true, message: 'Gasto anulado' });
  }),
);

export default router;
