/**
 * CRYPTO — Cifrado de datos sensibles a nivel de columna
 *
 * Protege PII (email, teléfono) de los clientes ante lectura directa de la base
 * de datos. Usa AES-256-GCM (cifrado autenticado): cada valor lleva su propio IV
 * aleatorio y un authTag que detecta manipulación.
 *
 * Formato almacenado: "enc:v1:<iv_hex>:<authTag_hex>:<ciphertext_hex>"
 * El prefijo "enc:v1:" permite distinguir un valor cifrado de uno en texto plano
 * (compatibilidad hacia atrás) y versionar el esquema a futuro.
 *
 * La clave (ENCRYPTION_KEY) vive fuera de la base de datos, en una variable de
 * entorno (en producción: AWS Secrets Manager). Sin la clave, las columnas
 * cifradas son ilegibles aunque alguien copie o descargue el archivo .db.
 *
 * Para búsqueda por teléfono se usa un HMAC-SHA256 determinista (telefono_hash):
 * permite igualdad exacta sin exponer el número, ya que el cifrado GCM no es
 * determinista (dos cifrados del mismo texto dan resultados distintos).
 */
import crypto from 'node:crypto';
import { config } from '../config/index.js';

const PREFIX = 'enc:v1:';
const ALGORITHM = 'aes-256-gcm';

/** Deriva una clave de 32 bytes a partir de la ENCRYPTION_KEY configurada. */
function getKey(): Buffer {
  const raw = config.encryptionKey;
  if (!raw) {
    throw new Error(
      'ENCRYPTION_KEY no está configurada. Es obligatoria para cifrar datos sensibles.',
    );
  }
  // Aceptamos la clave en hex (64 chars = 32 bytes) o cualquier string:
  // si no es hex de 32 bytes, la normalizamos con SHA-256 a 32 bytes.
  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    return Buffer.from(raw, 'hex');
  }
  return crypto.createHash('sha256').update(raw).digest();
}

/** Cifra un texto. Devuelve el string con formato "enc:v1:iv:tag:cipher". */
export function encrypt(plainText: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(12); // 96 bits, recomendado para GCM
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

/** ¿El valor ya está cifrado con nuestro esquema? */
export function isEncrypted(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.startsWith(PREFIX);
}

/**
 * Descifra un valor. Si el valor NO tiene el prefijo (texto plano heredado),
 * lo devuelve tal cual para no romper datos existentes sin migrar.
 */
export function decrypt(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  if (!isEncrypted(value)) return value; // texto plano heredado

  const parts = value.slice(PREFIX.length).split(':');
  if (parts.length !== 3) return value; // formato inesperado, no rompemos
  const [ivHex, tagHex, dataHex] = parts;

  try {
    const key = getKey();
    const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(dataHex, 'hex')),
      decipher.final(),
    ]);
    return decrypted.toString('utf8');
  } catch {
    // authTag inválido / clave equivocada: no exponemos nada
    return null;
  }
}

/** Cifra solo si hay valor; null/undefined/'' → null. */
export function encryptNullable(value: string | null | undefined): string | null {
  if (value === null || value === undefined || value === '') return null;
  return encrypt(value);
}

/**
 * HMAC-SHA256 determinista para búsqueda por igualdad exacta (ej. teléfono).
 * Normaliza el valor (trim + lowercase) antes de hashear.
 */
export function hmac(value: string | null | undefined): string | null {
  if (value === null || value === undefined || value === '') return null;
  const key = getKey();
  return crypto.createHmac('sha256', key).update(value.trim().toLowerCase()).digest('hex');
}
