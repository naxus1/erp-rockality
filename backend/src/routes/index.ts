/**
 * ROUTES — Router principal
 *
 * Registra todas las rutas del API bajo /api.
 */
import { Router } from 'express';

import catalogosRoutes from './catalogos.routes.js';
import categoriasProductoRoutes from './categorias-producto.routes.js';
import productosRoutes from './productos.routes.js';
import clientesRoutes from './clientes.routes.js';
import tercerosRoutes from './terceros.routes.js';
import ventasRoutes from './ventas.routes.js';
import pagosRoutes from './pagos.routes.js';
import gastosRoutes from './gastos.routes.js';

const router = Router();

// Health check
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Módulos
router.use('/catalogos', catalogosRoutes);
router.use('/categorias-producto', categoriasProductoRoutes);
router.use('/productos', productosRoutes);
router.use('/clientes', clientesRoutes);
router.use('/terceros', tercerosRoutes);
router.use('/ventas', ventasRoutes);
router.use('/pagos', pagosRoutes);
router.use('/gastos', gastosRoutes);

export default router;
