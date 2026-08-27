import { Router, Request, Response } from 'express';
import * as repo from '../repositories/compras.repository.js';
import { validate } from '../middleware/validate.js';
import { createCompraSchema } from '../schemas/compras.schema.js';

const router = Router();

// GET /api/compras — Listar
router.get('/', (req: Request, res: Response) => {
  const compras = repo.findAll({
    desde: req.query.desde as string,
    hasta: req.query.hasta as string,
  });
  res.json({ success: true, data: compras });
});

// GET /api/compras/:id — Detalle
router.get('/:id', (req: Request, res: Response) => {
  const compra = repo.findById(Number(req.params.id));
  if (!compra) {
    res.status(404).json({ success: false, error: 'Compra no encontrada' });
    return;
  }
  res.json({ success: true, data: compra });
});

// POST /api/compras — Registrar compra (suma stock + genera gasto)
router.post('/', validate(createCompraSchema), (req: Request, res: Response) => {
  try {
    const compra = repo.create(req.body);
    res.status(201).json({ success: true, data: compra });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error al registrar compra';
    res.status(400).json({ success: false, error: message });
  }
});

// POST /api/compras/:id/anular — Anular (resta stock + anula gasto)
router.post('/:id/anular', (req: Request, res: Response) => {
  const result = repo.anular(Number(req.params.id));
  if (!result) {
    res.status(400).json({ success: false, error: 'Compra no encontrada o ya anulada' });
    return;
  }
  res.json({ success: true, message: 'Compra anulada. Stock restado.' });
});

export default router;
