import { Router, Request, Response } from 'express';
import * as repo from '../repositories/planes.repository.js';
import * as suscRepo from '../repositories/suscripciones.repository.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/async-handler.js';
import {
  createPlanSchema,
  updatePlanSchema,
  createSuscripcionSchema,
} from '../schemas/planes.schema.js';

const router = Router();

// GET /api/planes
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const includeInactive = req.query.incluir_inactivos === '1';
    const planes = await repo.findAll(includeInactive);
    res.json({ success: true, data: planes });
  }),
);

// GET /api/planes/:id
router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const plan = await repo.findById(Number(req.params.id));
    if (!plan) {
      res.status(404).json({ success: false, error: 'Plan no encontrado' });
      return;
    }
    res.json({ success: true, data: plan });
  }),
);

// POST /api/planes
router.post(
  '/',
  validate(createPlanSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const plan = await repo.create(req.body);
    res.status(201).json({ success: true, data: plan });
  }),
);

// PUT /api/planes/:id
router.put(
  '/:id',
  validate(updatePlanSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const plan = await repo.update(Number(req.params.id), req.body);
    if (!plan) {
      res.status(404).json({ success: false, error: 'Plan no encontrado' });
      return;
    }
    res.json({ success: true, data: plan });
  }),
);

// ─── Suscripciones ──────────────────────────────────────

// GET /api/planes/suscripciones/activas
router.get(
  '/suscripciones/activas',
  asyncHandler(async (_req: Request, res: Response) => {
    await suscRepo.actualizarVencidas(); // auto-vencer las expiradas
    const suscripciones = await suscRepo.findAll({ estado: 'activa' });
    res.json({ success: true, data: suscripciones });
  }),
);

// GET /api/planes/suscripciones/por-vencer?dias=7
router.get(
  '/suscripciones/por-vencer',
  asyncHandler(async (req: Request, res: Response) => {
    const dias = Number(req.query.dias) || 7;
    await suscRepo.actualizarVencidas();
    const suscripciones = await suscRepo.findPorVencer(dias);
    res.json({ success: true, data: suscripciones });
  }),
);

// GET /api/planes/suscripciones/cliente/:cedula
router.get(
  '/suscripciones/cliente/:cedula',
  asyncHandler(async (req: Request, res: Response) => {
    const cedula = typeof req.params.cedula === 'string' ? req.params.cedula : '';
    const suscripciones = await suscRepo.findByCliente(cedula);
    res.json({ success: true, data: suscripciones });
  }),
);

// POST /api/planes/suscripciones — Crear suscripción directa (cortesía, sin venta)
router.post(
  '/suscripciones',
  validate(createSuscripcionSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const suscripcion = await suscRepo.create(req.body);
    if (!suscripcion) {
      res.status(400).json({ success: false, error: 'Cliente o plan no encontrado' });
      return;
    }
    res.status(201).json({ success: true, data: suscripcion });
  }),
);

export default router;
