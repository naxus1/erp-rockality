/**
 * INDEX — Punto de entrada para desarrollo local
 *
 * Arranca el servidor Express en el puerto configurado.
 * Este archivo SOLO se usa en desarrollo. En producción (Lambda),
 * el punto de entrada es handler.ts.
 */
import app from './app.js';
import { config } from './config/index.js';

app.listen(config.port, () => {
  console.warn(`[ERP Rockality] Servidor corriendo en http://localhost:${config.port}`);
  console.warn(`[ERP Rockality] Ambiente: ${config.nodeEnv}`);
  console.warn(`[ERP Rockality] Health check: http://localhost:${config.port}/api/health`);
});
