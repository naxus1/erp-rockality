import { Router, Request, Response } from 'express';
import * as repo from '../repositories/terceros.repository.js';
import { validate } from '../middleware/validate.js';
import { createTerceroSchema, updateTerceroSchema } from '../schemas/terceros.schema.js';

const router = Router();

// GET /api/terceros — Listar (filtro por tipo: ?tipo_tercero_id=1)
router.get('/', (req: Request, res: Response) => {
  const terceros = repo.findAll({
    tipo_tercero_id: req.query.tipo_tercero_id ? Number(req.query.tipo_tercero_id) : undefined,
    includeInactive: req.query.incluir_inactivos === '1',
  });
  res.json({ success: true, data: terceros });
});

// GET /api/terceros/buscar?q=texto
router.get('/buscar', (req: Request, res: Response) => {
  const query = (req.query.q as string) || '';
  if (query.length < 2) {
    res.status(400).json({ success: false, error: 'Mínimo 2 caracteres' });
    return;
  }
  const terceros = repo.search(query);
  res.json({ success: true, data: terceros });
});

// GET /api/terceros/:nit
router.get('/:nit', (req: Request, res: Response) => {
  const tercero = repo.findByNit(req.params.nit);
  if (!tercero) {
    res.status(404).json({ success: false, error: 'Tercero no encontrado' });
    return;
  }
  res.json({ success: true, data: tercero });
});

// POST /api/terceros
router.post('/', validate(createTerceroSchema), (req: Request, res: Response) => {
  const existing = repo.findByNit(req.body.nit);
  if (existing) {
    res.status(409).json({ success: false, error: 'Ya existe un tercero con ese NIT/cédula' });
    return;
  }
  const tercero = repo.create(req.body);
  res.status(201).json({ success: true, data: tercero });
});

// PUT /api/terceros/:nit
router.put('/:nit', validate(updateTerceroSchema), (req: Request, res: Response) => {
  const tercero = repo.update(req.params.nit, req.body);
  if (!tercero) {
    res.status(404).json({ success: false, error: 'Tercero no encontrado' });
    return;
  }
  res.json({ success: true, data: tercero });
});

// DELETE /api/terceros/:nit
router.delete('/:nit', (req: Request, res: Response) => {
  const deleted = repo.deactivate(req.params.nit);
  if (!deleted) {
    res.status(404).json({ success: false, error: 'Tercero no encontrado' });
    return;
  }
  res.json({ success: true, message: 'Tercero desactivado' });
});

export default router;
