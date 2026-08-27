import { Router, Request, Response } from 'express';
import * as repo from '../repositories/pagos.repository.js';
import { validate } from '../middleware/validate.js';
import { createPagoSchema } from '../schemas/pagos.schema.js';

const router = Router();

// GET /api/pagos/venta/:ventaId — Listar pagos de una venta
router.get('/venta/:ventaId', (req: Request, res: Response) => {
  const ventaId = Number(req.params.ventaId);
  const pagos = repo.findByVenta(ventaId);
  const totalPagado = repo.totalPagado(ventaId);
  const saldoPendiente = repo.saldoPendiente(ventaId);

  res.json({
    success: true,
    data: {
      pagos,
      resumen: {
        total_pagado: totalPagado,
        saldo_pendiente: saldoPendiente,
      },
    },
  });
});

// POST /api/pagos — Registrar un pago (abono)
router.post('/', validate(createPagoSchema), (req: Request, res: Response) => {
  // Verificar que no se pague más de lo que se debe
  const saldo = repo.saldoPendiente(req.body.venta_id);
  if (saldo <= 0) {
    res.status(400).json({ success: false, error: 'La venta ya está completamente pagada' });
    return;
  }
  if (req.body.monto > saldo) {
    res.status(400).json({
      success: false,
      error: `El monto excede el saldo pendiente ($${(saldo / 100).toLocaleString()})`,
    });
    return;
  }

  const pago = repo.create(req.body);
  const saldoRestante = repo.saldoPendiente(req.body.venta_id);

  res.status(201).json({
    success: true,
    data: pago,
    saldo_pendiente: saldoRestante,
    mensaje:
      saldoRestante === 0
        ? 'Venta pagada completamente'
        : `Saldo pendiente: $${(saldoRestante / 100).toLocaleString()}`,
  });
});

export default router;
