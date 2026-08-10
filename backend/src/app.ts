/**
 * APP — Configuración de Express
 *
 * Aquí se arma la aplicación Express con todos sus middlewares.
 * Este archivo NO arranca el servidor — eso lo hace index.ts (local)
 * o handler.ts (Lambda). Así el mismo código funciona en ambos entornos.
 */
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import { config } from './config/index.js';
import routes from './routes/index.js';

const app = express();

// ── Middlewares de seguridad ──────────────────────────────
// helmet: agrega headers de seguridad (X-Content-Type-Options, X-Frame-Options, etc.)
app.use(helmet());

// cors: permite que el frontend haga requests al backend
app.use(
  cors({
    origin: config.allowedOrigins.split(','),
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);

// ── Middlewares de parsing ────────────────────────────────
// Permite recibir JSON en el body de los requests
app.use(express.json({ limit: '1mb' }));

// ── Middlewares de logging ────────────────────────────────
// morgan: registra cada request en consola (útil para debugging)
// En producción usa formato compacto, en desarrollo usa formato detallado
app.use(morgan(config.isProduction ? 'combined' : 'dev'));

// ── Rutas ─────────────────────────────────────────────────
app.use('/api', routes);

// ── Manejo de rutas no encontradas ────────────────────────
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: 'Ruta no encontrada',
  });
});

export default app;
