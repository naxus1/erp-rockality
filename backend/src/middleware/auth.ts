/**
 * MIDDLEWARE — Autenticación (JWT de AWS Cognito)
 *
 * Protege las rutas de la API. Dos modos:
 *
 * - PRODUCCIÓN (o si Cognito está configurado): valida el JWT que envía el
 *   frontend en el header `Authorization: Bearer <token>` contra el User Pool
 *   de Cognito (verifica firma, expiración, audiencia). Si es válido, puebla
 *   `req.user` con la identidad; si no, responde 401.
 *
 * - DESARROLLO sin Cognito configurado: acepta un usuario simulado para no
 *   bloquear el trabajo local. El usuario se puede indicar con el header
 *   `X-Dev-User` (ej. "admin" | "gerente" | "vendedor"); por defecto "admin".
 *   Este modo NUNCA se activa en producción (allí Cognito es obligatorio).
 *
 * La identidad de `req.user` es la fuente de verdad para created_by/updated_by
 * y la auditoría: el cliente ya no controla quién hace cada acción.
 */
import type { Request, Response, NextFunction } from 'express';
import { CognitoJwtVerifier } from 'aws-jwt-verify';
import { config } from '../config/index.js';

export interface AuthUser {
  sub: string; // id único del usuario en Cognito
  username: string; // usuario legible
  email: string | null;
  rol: string; // derivado de cognito:groups (admin | gerente | vendedor)
}

// Extiende el tipo Request de Express para incluir req.user
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

// Verificador de Cognito (solo se crea si está configurado)
const verifier = config.cognito.configured
  ? CognitoJwtVerifier.create({
      userPoolId: config.cognito.userPoolId,
      clientId: config.cognito.clientId,
      tokenUse: 'id',
    })
  : null;

/** Extrae el rol desde los grupos de Cognito (primer grupo conocido). */
function rolDesdeGrupos(grupos: unknown): string {
  const lista = Array.isArray(grupos) ? (grupos as string[]) : [];
  if (lista.includes('admin')) return 'admin';
  if (lista.includes('gerente')) return 'gerente';
  if (lista.includes('vendedor')) return 'vendedor';
  return 'vendedor'; // rol mínimo por defecto
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  // ── Modo desarrollo sin Cognito ──
  if (!config.cognito.configured) {
    if (config.isProduction) {
      // Esto no debería ocurrir (config hace fail-fast), pero por seguridad:
      res.status(500).json({ success: false, error: 'Autenticación no configurada' });
      return;
    }
    const devUser = (req.header('X-Dev-User') || 'admin').toLowerCase();
    req.user = {
      sub: `dev-${devUser}`,
      username: devUser,
      email: `${devUser}@rockality.dev`,
      rol: ['admin', 'gerente', 'vendedor'].includes(devUser) ? devUser : 'admin',
    };
    next();
    return;
  }

  // ── Modo real: validar JWT de Cognito ──
  const authHeader = req.header('Authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!token) {
    res.status(401).json({ success: false, error: 'Falta el token de autenticación' });
    return;
  }

  try {
    const payload = await verifier!.verify(token);
    req.user = {
      sub: String(payload.sub),
      username: String(payload['cognito:username'] || payload.sub),
      email: (payload.email as string) || null,
      rol: rolDesdeGrupos(payload['cognito:groups']),
    };
    next();
  } catch {
    res.status(401).json({ success: false, error: 'Token inválido o expirado' });
  }
}

/**
 * Restringe una ruta a ciertos roles. Úsese después de requireAuth.
 * Ej: router.post('/', requireAuth, requireRole('admin'), handler)
 */
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.rol)) {
      res.status(403).json({ success: false, error: 'No tienes permiso para esta acción' });
      return;
    }
    next();
  };
}
