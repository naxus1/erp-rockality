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

// Autenticación con AWS Cognito. En producción es OBLIGATORIA (fail-fast).
// En desarrollo, si no está configurada, el backend usa un modo "auth dev"
// que acepta un usuario simulado para no bloquear el trabajo local.
const cognitoUserPoolId = process.env.COGNITO_USER_POOL_ID || '';
const cognitoClientId = process.env.COGNITO_CLIENT_ID || '';
const cognitoRegion = process.env.COGNITO_REGION || 'us-east-1';
const cognitoConfigured = Boolean(cognitoUserPoolId && cognitoClientId);

if (isProduction && !cognitoConfigured) {
  throw new Error(
    'COGNITO_USER_POOL_ID y COGNITO_CLIENT_ID son obligatorios en producción. Configúralos en el entorno.',
  );
}

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  dbPath: process.env.DB_PATH || path.resolve(__dirname, '../../data/dev.db'),
  allowedOrigins: process.env.ALLOWED_ORIGINS || 'http://localhost:5173',
  isProduction,
  encryptionKey,
  // ARN del secreto en AWS Secrets Manager con la clave de cifrado (producción).
  // Si está seteado, se resuelve al arrancar y tiene prioridad sobre encryptionKey.
  encryptionKeySecretArn: process.env.ENCRYPTION_KEY_SECRET_ARN || '',
  cognito: {
    userPoolId: cognitoUserPoolId,
    clientId: cognitoClientId,
    region: cognitoRegion,
    configured: cognitoConfigured,
  },
} as const;
