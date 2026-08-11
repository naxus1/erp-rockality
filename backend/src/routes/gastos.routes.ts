import { Router, Request, Response } from 'express';
import * as repo from '../repositories/gastos.repository.js';
import { validate } from '../middleware/validate.js';
import { createGastoSchema } from '../schemas/gastos.schema.js';

const router = Router();

// GET /api/gastos — Listar con filtros
router.get('/', (req: Request, res: Response) => {
  const gastos = repo.findAll({
    periodo_mes: req.query.periodo_mes ? Number(req.query.periodo_mes) : undefined,
    periodo_anio: req.query.periodo_anio ? Number(req.query.periodo_anio) : undefined,
    gerencia_id: req.query.gerencia_id ? Number(req.query.gerencia_id) : undefined,
    tipo_gasto_id: req.query.tipo_gasto_id ? Number(req.query.tipo_gasto_id) : undefined,
  });
  res.json({ success: true, data: gastos });
});

// GET /api/gastos/resumen?mes=8&anio=2026 — Total del periodo
router.get('/resumen', (req: Request, res: Response) => {
  const mes = Number(req.query.mes);
  const anio = Number(req.query.anio);
  if (!mes || !anio) {
    res.status(400).json({ success: false, error: 'Parámetros mes y anio son obligatorios' });
    return;
  }
  const resumen = repo.totalPorPeriodo(mes, anio);
  res.json({ success: true, data: resumen });
});

// GET /api/gastos/:id
router.get('/:id', (req: Request, res: Response) => {
  const gasto = repo.findById(Number(req.params.id));
  if (!gasto) {
    res.status(404).json({ success: false, error: 'Gasto no encontrado' });
    return;
  }
  res.json({ success: true, data: gasto });
});

// POST /api/gastos
router.post('/', validate(createGastoSchema), (req: Request, res: Response) => {
  const gasto = repo.create(req.body);
  res.status(201).json({ success: true, data: gasto });
});

export default router;
