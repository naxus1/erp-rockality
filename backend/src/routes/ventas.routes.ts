import { Router, Request, Response } from 'express';
import * as repo from '../repositories/ventas.repository.js';
import { validate } from '../middleware/validate.js';
import { createVentaSchema } from '../schemas/ventas.schema.js';

const router = Router();

// GET /api/ventas — Listar ventas con filtros
router.get('/', (req: Request, res: Response) => {
  const ventas = repo.findAll({
    desde: req.query.desde as string,
    hasta: req.query.hasta as string,
    estado: req.query.estado as string,
    tipo: req.query.tipo as string,
  });
  res.json({ success: true, data: ventas });
});

// GET /api/ventas/:id — Detalle completo de una venta
router.get('/:id', (req: Request, res: Response) => {
  const venta = repo.findById(Number(req.params.id));
  if (!venta) {
    res.status(404).json({ success: false, error: 'Venta no encontrada' });
    return;
  }
  res.json({ success: true, data: venta });
});

// POST /api/ventas — Registrar venta
router.post('/', validate(createVentaSchema), (req: Request, res: Response) => {
  try {
    const venta = repo.create(req.body);
    res.status(201).json({ success: true, data: venta });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error al crear la venta';
    res.status(400).json({ success: false, error: message });
  }
});

// POST /api/ventas/:id/anular — Anular venta (restaura stock, cancela suscripción)
router.post('/:id/anular', (req: Request, res: Response) => {
  const result = repo.anular(Number(req.params.id));
  if (!result) {
    res.status(400).json({ success: false, error: 'Venta no encontrada o ya anulada' });
    return;
  }
  res.json({ success: true, message: 'Venta anulada. Stock restaurado.' });
});

export default router;
