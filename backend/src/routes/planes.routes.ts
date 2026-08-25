import { Router, Request, Response } from 'express';
import * as repo from '../repositories/planes.repository.js';
import * as suscRepo from '../repositories/suscripciones.repository.js';
import { validate } from '../middleware/validate.js';
import { createPlanSchema, updatePlanSchema } from '../schemas/planes.schema.js';

const router = Router();

// GET /api/planes
router.get('/', (req: Request, res: Response) => {
  const includeInactive = req.query.incluir_inactivos === '1';
  const planes = repo.findAll(includeInactive);
  res.json({ success: true, data: planes });
});

// GET /api/planes/:id
router.get('/:id', (req: Request, res: Response) => {
  const plan = repo.findById(Number(req.params.id));
  if (!plan) {
    res.status(404).json({ success: false, error: 'Plan no encontrado' });
    return;
  }
  res.json({ success: true, data: plan });
});

// POST /api/planes
router.post('/', validate(createPlanSchema), (req: Request, res: Response) => {
  const plan = repo.create(req.body);
  res.status(201).json({ success: true, data: plan });
});

// PUT /api/planes/:id
router.put('/:id', validate(updatePlanSchema), (req: Request, res: Response) => {
  const plan = repo.update(Number(req.params.id), req.body);
  if (!plan) {
    res.status(404).json({ success: false, error: 'Plan no encontrado' });
    return;
  }
  res.json({ success: true, data: plan });
});

// ─── Suscripciones ──────────────────────────────────────

// GET /api/planes/suscripciones/activas
router.get('/suscripciones/activas', (_req: Request, res: Response) => {
  suscRepo.actualizarVencidas(); // auto-vencer las expiradas
  const suscripciones = suscRepo.findAll({ estado: 'activa' });
  res.json({ success: true, data: suscripciones });
});

// GET /api/planes/suscripciones/por-vencer?dias=7
router.get('/suscripciones/por-vencer', (req: Request, res: Response) => {
  const dias = Number(req.query.dias) || 7;
  suscRepo.actualizarVencidas();
  const suscripciones = suscRepo.findPorVencer(dias);
  res.json({ success: true, data: suscripciones });
});

// GET /api/planes/suscripciones/cliente/:cedula
router.get('/suscripciones/cliente/:cedula', (req: Request, res: Response) => {
  const suscripciones = suscRepo.findByCliente(req.params.cedula);
  res.json({ success: true, data: suscripciones });
});

export default router;
