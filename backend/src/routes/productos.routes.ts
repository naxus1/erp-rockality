import { Router, Request, Response } from 'express';
import * as repo from '../repositories/productos.repository.js';
import { validate } from '../middleware/validate.js';
import { createProductoSchema, updateProductoSchema } from '../schemas/productos.schema.js';

const router = Router();

// GET /api/productos — Listar todos (activos)
router.get('/', (req: Request, res: Response) => {
  const includeInactive = req.query.incluir_inactivos === '1';
  const productos = repo.findAll(includeInactive);
  res.json({ success: true, data: productos });
});

// GET /api/productos/stock-bajo — Productos con stock bajo
router.get('/stock-bajo', (_req: Request, res: Response) => {
  const productos = repo.findStockBajo();
  res.json({ success: true, data: productos });
});

// GET /api/productos/categoria/:categoriaId — Por categoría
router.get('/categoria/:categoriaId', (req: Request, res: Response) => {
  const productos = repo.findByCategoria(Number(req.params.categoriaId));
  res.json({ success: true, data: productos });
});

// GET /api/productos/:id — Obtener uno
router.get('/:id', (req: Request, res: Response) => {
  const producto = repo.findById(Number(req.params.id));
  if (!producto) {
    res.status(404).json({ success: false, error: 'Producto no encontrado' });
    return;
  }
  res.json({ success: true, data: producto });
});

// POST /api/productos — Crear
router.post('/', validate(createProductoSchema), (req: Request, res: Response) => {
  const producto = repo.create(req.body);
  res.status(201).json({ success: true, data: producto });
});

// PUT /api/productos/:id — Editar
router.put('/:id', validate(updateProductoSchema), (req: Request, res: Response) => {
  const producto = repo.update(Number(req.params.id), req.body);
  if (!producto) {
    res.status(404).json({ success: false, error: 'Producto no encontrado' });
    return;
  }
  res.json({ success: true, data: producto });
});

// DELETE /api/productos/:id — Desactivar (soft delete)
router.delete('/:id', (req: Request, res: Response) => {
  const deleted = repo.deactivate(Number(req.params.id));
  if (!deleted) {
    res.status(404).json({ success: false, error: 'Producto no encontrado' });
    return;
  }
  res.json({ success: true, message: 'Producto desactivado' });
});

export default router;
