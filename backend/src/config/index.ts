/**
 * CONFIG — Variables de entorno y configuración de la aplicación
 *
 * Centraliza todas las variables de entorno en un solo lugar.
 * Si falta alguna variable requerida, el servidor no arranca.
 */

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  dbPath: process.env.DB_PATH || './data/dev.db',
  allowedOrigins: process.env.ALLOWED_ORIGINS || 'http://localhost:5173',
  isProduction: process.env.NODE_ENV === 'production',
} as const;
