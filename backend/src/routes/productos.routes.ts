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

// GET /api/productos/:sku — Obtener uno por SKU
router.get('/:sku', (req: Request, res: Response) => {
  const producto = repo.findBySku(req.params.sku);
  if (!producto) {
    res.status(404).json({ success: false, error: 'Producto no encontrado' });
    return;
  }
  res.json({ success: true, data: producto });
});

// POST /api/productos — Crear
router.post('/', validate(createProductoSchema), (req: Request, res: Response) => {
  const existing = repo.findBySku(req.body.sku);
  if (existing) {
    res.status(409).json({ success: false, error: 'Ya existe un producto con ese SKU' });
    return;
  }
  const producto = repo.create(req.body);
  res.status(201).json({ success: true, data: producto });
});

// PUT /api/productos/:sku — Editar
router.put('/:sku', validate(updateProductoSchema), (req: Request, res: Response) => {
  const producto = repo.update(req.params.sku, req.body);
  if (!producto) {
    res.status(404).json({ success: false, error: 'Producto no encontrado' });
    return;
  }
  res.json({ success: true, data: producto });
});

// DELETE /api/productos/:sku — Desactivar (soft delete)
router.delete('/:sku', (req: Request, res: Response) => {
  const deleted = repo.deactivate(req.params.sku);
  if (!deleted) {
    res.status(404).json({ success: false, error: 'Producto no encontrado' });
    return;
  }
  res.json({ success: true, message: 'Producto desactivado' });
});

export default router;
