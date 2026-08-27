/**
 * INDEX — Punto de entrada para desarrollo local
 *
 * Arranca el servidor Express en el puerto configurado.
 * Ejecuta migraciones automáticamente al arrancar (solo en desarrollo).
 * Este archivo SOLO se usa en desarrollo. En producción (Lambda),
 * el punto de entrada es handler.ts.
 */
import app from './app.js';
import { config } from './config/index.js';
import { initDatabase } from './db/init.js';

// Inicializar DB (crear tablas si no existen)
initDatabase();

app.listen(config.port, () => {
  console.warn(`[ERP Rockality] Servidor corriendo en http://localhost:${config.port}`);
  console.warn(`[ERP Rockality] Ambiente: ${config.nodeEnv}`);
  console.warn(`[ERP Rockality] Health check: http://localhost:${config.port}/api/health`);
});
