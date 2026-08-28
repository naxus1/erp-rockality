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
import comprasRoutes from './compras.routes.js';
import planesRoutes from './planes.routes.js';
import gastosRoutes from './gastos.routes.js';
import cajaRoutes from './caja.routes.js';
import reportesRoutes from './reportes.routes.js';
import usuariosRoutes from './usuarios.routes.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Health check — PÚBLICO (antes del middleware de auth)
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// A partir de aquí, todas las rutas requieren autenticación
router.use(requireAuth);

// Módulos (protegidos)
router.use('/catalogos', catalogosRoutes);
router.use('/categorias-producto', categoriasProductoRoutes);
router.use('/productos', productosRoutes);
router.use('/clientes', clientesRoutes);
router.use('/terceros', tercerosRoutes);
router.use('/ventas', ventasRoutes);
router.use('/pagos', pagosRoutes);
router.use('/compras', comprasRoutes);
router.use('/planes', planesRoutes);
router.use('/gastos', gastosRoutes);
router.use('/caja', cajaRoutes);
router.use('/reportes', reportesRoutes);
router.use('/usuarios', usuariosRoutes);

export default router;
