/**
 * ROUTES — Router principal
 *
 * Registra todas las rutas del API bajo /api.
 */
import { Router } from 'express';

import categoriasProductoRoutes from './categorias-producto.routes.js';
import productosRoutes from './productos.routes.js';
import clientesRoutes from './clientes.routes.js';

const router = Router();

// Health check
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Módulos
router.use('/categorias-producto', categoriasProductoRoutes);
router.use('/productos', productosRoutes);
router.use('/clientes', clientesRoutes);

export default router;
