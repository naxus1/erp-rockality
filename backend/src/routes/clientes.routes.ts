import { Router, Request, Response } from 'express';
import * as repo from '../repositories/clientes.repository.js';
import { getDatabase } from '../db/connection.js';
import { validate } from '../middleware/validate.js';
import { createClienteSchema, updateClienteSchema } from '../schemas/clientes.schema.js';

const router = Router();

// GET /api/clientes — Listar todos (activos)
router.get('/', (req: Request, res: Response) => {
  const includeInactive = req.query.incluir_inactivos === '1';
  const clientes = repo.findAll(includeInactive);
  res.json({ success: true, data: clientes });
});

// GET /api/clientes/buscar?q=texto — Buscar por nombre/apellidos/teléfono/cédula
router.get('/buscar', (req: Request, res: Response) => {
  const query = (req.query.q as string) || '';
  if (query.length < 2) {
    res.status(400).json({ success: false, error: 'La búsqueda debe tener al menos 2 caracteres' });
    return;
  }
  const clientes = repo.search(query);
  res.json({ success: true, data: clientes });
});

// GET /api/clientes/:cedula — Obtener uno por cédula
router.get('/:cedula', (req: Request, res: Response) => {
  const cliente = repo.findByCedula(req.params.cedula);
  if (!cliente) {
    res.status(404).json({ success: false, error: 'Cliente no encontrado' });
    return;
  }
  res.json({ success: true, data: cliente });
});

// POST /api/clientes — Crear
router.post('/', validate(createClienteSchema), (req: Request, res: Response) => {
  // Verificar que la cédula no existe
  const existing = repo.findByCedula(req.body.cedula);
  if (existing) {
    res.status(409).json({ success: false, error: 'Ya existe un cliente con esa cédula' });
    return;
  }
  const cliente = repo.create(req.body);
  res.status(201).json({ success: true, data: cliente });
});

// PUT /api/clientes/:cedula — Editar
router.put('/:cedula', validate(updateClienteSchema), (req: Request, res: Response) => {
  const cliente = repo.update(req.params.cedula, req.body);
  if (!cliente) {
    res.status(404).json({ success: false, error: 'Cliente no encontrado' });
    return;
  }
  res.json({ success: true, data: cliente });
});

// DELETE /api/clientes/:cedula — Desactivar (soft delete)
router.delete('/:cedula', (req: Request, res: Response) => {
  const deleted = repo.deactivate(req.params.cedula);
  if (!deleted) {
    res.status(404).json({ success: false, error: 'Cliente no encontrado' });
    return;
  }
  res.json({ success: true, message: 'Cliente desactivado' });
});

// GET /api/clientes/:cedula/ficha — Ficha completa del cliente
router.get('/:cedula/ficha', (req: Request, res: Response) => {
  const cliente = repo.findByCedula(req.params.cedula);
  if (!cliente) {
    res.status(404).json({ success: false, error: 'Cliente no encontrado' });
    return;
  }
  const db = getDatabase();
  const ventas = db
    .prepare(
      'SELECT id, fecha, total, estado, tipo FROM ventas WHERE cliente_cedula = ? ORDER BY fecha DESC',
    )
    .all(req.params.cedula);
  const suscripciones = db
    .prepare(
      "SELECT s.*, p.nombre as plan_nombre, p.modalidad as plan_modalidad, CAST(julianday(s.fecha_fin) - julianday('now') AS INTEGER) as dias_restantes FROM suscripciones s JOIN planes p ON s.plan_id = p.id WHERE s.cliente_cedula = ? ORDER BY s.fecha_inicio DESC",
    )
    .all(req.params.cedula);
  res.json({ success: true, data: { cliente, ventas, suscripciones } });
});
router.post('/:cedula/anonimizar', (req: Request, res: Response) => {
  const result = repo.anonimizar(req.params.cedula);
  if (!result) {
    res.status(404).json({ success: false, error: 'Cliente no encontrado' });
    return;
  }
  res.json({ success: true, message: 'Datos del cliente anonimizados exitosamente' });
});

export default router;
