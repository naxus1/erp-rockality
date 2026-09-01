import { Router, Request, Response } from 'express';
import * as repo from '../repositories/productos.repository.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/async-handler.js';
import { createProductoSchema, updateProductoSchema } from '../schemas/productos.schema.js';

const router = Router();

// GET /api/productos — Listar todos (activos)
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const includeInactive = req.query.incluir_inactivos === '1';
    const productos = await repo.findAll(includeInactive);
    res.json({ success: true, data: productos });
  }),
);

// GET /api/productos/stock-bajo — Productos con stock bajo
router.get(
  '/stock-bajo',
  asyncHandler(async (_req: Request, res: Response) => {
    const productos = await repo.findStockBajo();
    res.json({ success: true, data: productos });
  }),
);

// GET /api/productos/categoria/:categoriaId — Por categoría
router.get(
  '/categoria/:categoriaId',
  asyncHandler(async (req: Request, res: Response) => {
    const productos = await repo.findByCategoria(Number(req.params.categoriaId));
    res.json({ success: true, data: productos });
  }),
);

// GET /api/productos/:sku — Obtener uno por SKU
router.get(
  '/:sku',
  asyncHandler(async (req: Request, res: Response) => {
    const sku = typeof req.params.sku === 'string' ? req.params.sku : '';
    const producto = await repo.findBySku(sku);
    if (!producto) {
      res.status(404).json({ success: false, error: 'Producto no encontrado' });
      return;
    }
    res.json({ success: true, data: producto });
  }),
);

// POST /api/productos — Crear
router.post(
  '/',
  validate(createProductoSchema),
  asyncHandler(async (req: Request, res: Response) => {
    if (req.body.sku) {
      const existing = await repo.findBySku(req.body.sku);
      if (existing) {
        res.status(409).json({ success: false, error: 'Ya existe un producto con ese SKU' });
        return;
      }
    }
    try {
      const producto = await repo.create(req.body);
      res.status(201).json({ success: true, data: producto });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error creando producto';
      res.status(400).json({ success: false, error: message });
    }
  }),
);

// PUT /api/productos/:sku — Editar
router.put(
  '/:sku',
  validate(updateProductoSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const sku = typeof req.params.sku === 'string' ? req.params.sku : '';
    const producto = await repo.update(sku, req.body);
    if (!producto) {
      res.status(404).json({ success: false, error: 'Producto no encontrado' });
      return;
    }
    res.json({ success: true, data: producto });
  }),
);

// DELETE /api/productos/:sku — Desactivar (soft delete)
router.delete(
  '/:sku',
  asyncHandler(async (req: Request, res: Response) => {
    const sku = typeof req.params.sku === 'string' ? req.params.sku : '';
    const deleted = await repo.deactivate(sku);
    if (!deleted) {
      res.status(404).json({ success: false, error: 'Producto no encontrado' });
      return;
    }
    res.json({ success: true, message: 'Producto desactivado' });
  }),
);

export default router;
