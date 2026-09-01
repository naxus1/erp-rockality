/**
 * CONFIG — Variables de entorno y configuración de la aplicación
 *
 * Centraliza todas las variables de entorno en un solo lugar.
 * Si falta alguna variable requerida, el servidor no arranca.
 */

import path from 'path';
import dotenv from 'dotenv';

// Carga variables desde .env (en la raíz del backend). En producción las
// variables las inyecta el entorno (AWS Secrets Manager / Lambda env).
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const isProduction = process.env.NODE_ENV === 'production';

// Clave de cifrado de datos sensibles. En dev usamos una por defecto para no
// bloquear el arranque local; en producción es OBLIGATORIA (fail-fast).
const DEV_ENCRYPTION_KEY = 'dev-only-insecure-key-change-me-32bytes!!';
const encryptionKey = process.env.ENCRYPTION_KEY || (isProduction ? '' : DEV_ENCRYPTION_KEY);
// ARN del secreto con la clave de cifrado. Si está seteado, la clave se resuelve
// de forma asíncrona al arrancar (loadEncryptionKey), por lo que NO es necesario
// tener ENCRYPTION_KEY en el entorno.
const encryptionKeySecretArn = process.env.ENCRYPTION_KEY_SECRET_ARN || '';

// Fail-fast: en producción debe haber una fuente para la clave de cifrado, ya
// sea la env var directa o el ARN del secreto (que se resuelve al arrancar).
if (isProduction && !encryptionKey && !encryptionKeySecretArn) {
  throw new Error(
    'ENCRYPTION_KEY (o ENCRYPTION_KEY_SECRET_ARN) es obligatoria en producción. Configúrala en el entorno (AWS Secrets Manager).',
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

// Conexión a PostgreSQL (Neon). En producción la inyecta el entorno (Secrets
// Manager -> env var). En desarrollo se toma de backend/.env. Es OBLIGATORIA en
// producción (fail-fast): sin base de datos no hay servicio.
const databaseUrl = process.env.DATABASE_URL || '';
if (isProduction && !databaseUrl) {
  throw new Error(
    'DATABASE_URL es obligatoria en producción. Configúrala en el entorno (AWS Secrets Manager).',
  );
}

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl,
  allowedOrigins: process.env.ALLOWED_ORIGINS || 'http://localhost:5173',
  isProduction,
  encryptionKey,
  // ARN del secreto en AWS Secrets Manager con la clave de cifrado (producción).
  // Si está seteado, se resuelve al arrancar y tiene prioridad sobre encryptionKey.
  encryptionKeySecretArn,
  cognito: {
    userPoolId: cognitoUserPoolId,
    clientId: cognitoClientId,
    region: cognitoRegion,
    configured: cognitoConfigured,
  },
} as const;
