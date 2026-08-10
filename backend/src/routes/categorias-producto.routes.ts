import { Router, Request, Response } from 'express';
import * as repo from '../repositories/categorias-producto.repository.js';
import { validate } from '../middleware/validate.js';
import {
  createCategoriaSchema,
  updateCategoriaSchema,
} from '../schemas/categorias-producto.schema.js';

const router = Router();

// GET /api/categorias-producto — Listar todas
router.get('/', (_req: Request, res: Response) => {
  const categorias = repo.findAll();
  res.json({ success: true, data: categorias });
});

// GET /api/categorias-producto/:id — Obtener una
router.get('/:id', (req: Request, res: Response) => {
  const categoria = repo.findById(Number(req.params.id));
  if (!categoria) {
    res.status(404).json({ success: false, error: 'Categoría no encontrada' });
    return;
  }
  res.json({ success: true, data: categoria });
});

// POST /api/categorias-producto — Crear
router.post('/', validate(createCategoriaSchema), (req: Request, res: Response) => {
  const categoria = repo.create(req.body);
  res.status(201).json({ success: true, data: categoria });
});

// PUT /api/categorias-producto/:id — Editar
router.put('/:id', validate(updateCategoriaSchema), (req: Request, res: Response) => {
  const categoria = repo.update(Number(req.params.id), req.body);
  if (!categoria) {
    res.status(404).json({ success: false, error: 'Categoría no encontrada' });
    return;
  }
  res.json({ success: true, data: categoria });
});

export default router;
