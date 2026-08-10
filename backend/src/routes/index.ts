/**
 * ROUTES — Definición de endpoints HTTP
 *
 * Aquí se registran las rutas de la API y se conectan con los controllers.
 * Cada módulo tiene su propio archivo de rutas:
 *   - productos.routes.ts
 *   - ventas.routes.ts
 *   - gastos.routes.ts
 *   - clientes.routes.ts
 *   - reportes.routes.ts
 */
import { Router } from 'express';

const router = Router();

// Health check
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;
