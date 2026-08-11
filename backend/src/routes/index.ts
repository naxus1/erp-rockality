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
import proveedoresRoutes from './proveedores.routes.js';
import pagosRoutes from './pagos.routes.js';

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
router.use('/proveedores', proveedoresRoutes);
router.use('/pagos', pagosRoutes);

export default router;
