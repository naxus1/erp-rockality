import { Router, Request, Response } from 'express';
import * as repo from '../repositories/clientes.repository.js';
import { validate } from '../middleware/validate.js';
import { createClienteSchema, updateClienteSchema } from '../schemas/clientes.schema.js';

const router = Router();

// GET /api/clientes — Listar todos (activos)
router.get('/', (req: Request, res: Response) => {
  const includeInactive = req.query.incluir_inactivos === '1';
  const clientes = repo.findAll(includeInactive);
  res.json({ success: true, data: clientes });
});

// GET /api/clientes/buscar?q=texto — Buscar por nombre/teléfono/email
router.get('/buscar', (req: Request, res: Response) => {
  const query = (req.query.q as string) || '';
  if (query.length < 2) {
    res.status(400).json({ success: false, error: 'La búsqueda debe tener al menos 2 caracteres' });
    return;
  }
  const clientes = repo.search(query);
  res.json({ success: true, data: clientes });
});

// GET /api/clientes/:id — Obtener uno
router.get('/:id', (req: Request, res: Response) => {
  const cliente = repo.findById(Number(req.params.id));
  if (!cliente) {
    res.status(404).json({ success: false, error: 'Cliente no encontrado' });
    return;
  }
  res.json({ success: true, data: cliente });
});

// POST /api/clientes — Crear
router.post('/', validate(createClienteSchema), (req: Request, res: Response) => {
  const cliente = repo.create(req.body);
  res.status(201).json({ success: true, data: cliente });
});

// PUT /api/clientes/:id — Editar
router.put('/:id', validate(updateClienteSchema), (req: Request, res: Response) => {
  const cliente = repo.update(Number(req.params.id), req.body);
  if (!cliente) {
    res.status(404).json({ success: false, error: 'Cliente no encontrado' });
    return;
  }
  res.json({ success: true, data: cliente });
});

// DELETE /api/clientes/:id — Desactivar (soft delete)
router.delete('/:id', (req: Request, res: Response) => {
  const deleted = repo.deactivate(Number(req.params.id));
  if (!deleted) {
    res.status(404).json({ success: false, error: 'Cliente no encontrado' });
    return;
  }
  res.json({ success: true, message: 'Cliente desactivado' });
});

// POST /api/clientes/:id/anonimizar — Derecho de supresión (Habeas Data)
router.post('/:id/anonimizar', (req: Request, res: Response) => {
  const result = repo.anonimizar(Number(req.params.id));
  if (!result) {
    res.status(404).json({ success: false, error: 'Cliente no encontrado' });
    return;
  }
  res.json({ success: true, message: 'Datos del cliente anonimizados exitosamente' });
});

export default router;
