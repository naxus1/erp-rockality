/**
 * CONFIG — Variables de entorno y configuración de la aplicación
 *
 * Centraliza todas las variables de entorno en un solo lugar.
 * Si falta alguna variable requerida, el servidor no arranca.
 */

import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carga variables desde .env (en la raíz del backend). En producción las
// variables las inyecta el entorno (AWS Secrets Manager / Lambda env).
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const isProduction = process.env.NODE_ENV === 'production';

// Clave de cifrado de datos sensibles. En dev usamos una por defecto para no
// bloquear el arranque local; en producción es OBLIGATORIA (fail-fast).
const DEV_ENCRYPTION_KEY = 'dev-only-insecure-key-change-me-32bytes!!';
const encryptionKey = process.env.ENCRYPTION_KEY || (isProduction ? '' : DEV_ENCRYPTION_KEY);

if (isProduction && !encryptionKey) {
  throw new Error(
    'ENCRYPTION_KEY es obligatoria en producción. Configúrala en el entorno (AWS Secrets Manager).',
  );
}

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  dbPath: process.env.DB_PATH || path.resolve(__dirname, '../../data/dev.db'),
  allowedOrigins: process.env.ALLOWED_ORIGINS || 'http://localhost:5173',
  isProduction,
  encryptionKey,
} as const;
