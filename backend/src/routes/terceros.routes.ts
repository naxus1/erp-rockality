import { Router, Request, Response } from 'express';
import * as repo from '../repositories/terceros.repository.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/async-handler.js';
import { createTerceroSchema, updateTerceroSchema } from '../schemas/terceros.schema.js';

const router = Router();

// GET /api/terceros — Listar (filtro por tipo: ?tipo_tercero_id=1)
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const terceros = await repo.findAll({
      tipo_tercero_id: req.query.tipo_tercero_id ? Number(req.query.tipo_tercero_id) : undefined,
      includeInactive: req.query.incluir_inactivos === '1',
    });
    res.json({ success: true, data: terceros });
  }),
);

// GET /api/terceros/buscar?q=texto
router.get(
  '/buscar',
  asyncHandler(async (req: Request, res: Response) => {
    const q = (req.query.q as string) || '';
    if (q.length < 2) {
      res.status(400).json({ success: false, error: 'Mínimo 2 caracteres' });
      return;
    }
    const terceros = await repo.search(q);
    res.json({ success: true, data: terceros });
  }),
);

// GET /api/terceros/:nit
router.get(
  '/:nit',
  asyncHandler(async (req: Request, res: Response) => {
    const nit = typeof req.params.nit === 'string' ? req.params.nit : '';
    const tercero = await repo.findByNit(nit);
    if (!tercero) {
      res.status(404).json({ success: false, error: 'Tercero no encontrado' });
      return;
    }
    res.json({ success: true, data: tercero });
  }),
);

// POST /api/terceros
router.post(
  '/',
  validate(createTerceroSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const existing = await repo.findByNit(req.body.nit);
    if (existing) {
      res.status(409).json({ success: false, error: 'Ya existe un tercero con ese NIT/cédula' });
      return;
    }
    const tercero = await repo.create(req.body);
    res.status(201).json({ success: true, data: tercero });
  }),
);

// PUT /api/terceros/:nit
router.put(
  '/:nit',
  validate(updateTerceroSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const nit = typeof req.params.nit === 'string' ? req.params.nit : '';
    const tercero = await repo.update(nit, req.body);
    if (!tercero) {
      res.status(404).json({ success: false, error: 'Tercero no encontrado' });
      return;
    }
    res.json({ success: true, data: tercero });
  }),
);

// DELETE /api/terceros/:nit
router.delete(
  '/:nit',
  asyncHandler(async (req: Request, res: Response) => {
    const nit = typeof req.params.nit === 'string' ? req.params.nit : '';
    const deleted = await repo.deactivate(nit);
    if (!deleted) {
      res.status(404).json({ success: false, error: 'Tercero no encontrado' });
      return;
    }
    res.json({ success: true, message: 'Tercero desactivado' });
  }),
);

export default router;
