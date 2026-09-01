/**
 * ROUTES — Usuarios del sistema
 */
import { Router, Request, Response } from 'express';
import { query } from '../db/connection.js';
import { asyncHandler } from '../middleware/async-handler.js';

const router = Router();

interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: string;
  activo: number;
  created_at: string;
}

/** ¿El error de pg es una violación de restricción única? */
function esDuplicado(error: unknown): boolean {
  return (
    typeof error === 'object' && error !== null && (error as { code?: string }).code === '23505'
  );
}

// GET /api/usuarios
router.get(
  '/',
  asyncHandler(async (_req: Request, res: Response) => {
    const usuariosRes = await query('SELECT * FROM usuarios_sistema ORDER BY nombre');
    res.json({ success: true, data: usuariosRes.rows });
  }),
);

// POST /api/usuarios
router.post(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const { id, nombre, email, rol } = req.body;
    if (!id || !nombre || !email || !rol) {
      res.status(400).json({ success: false, error: 'id, nombre, email y rol son obligatorios' });
      return;
    }
    if (!['admin', 'gerente', 'vendedor'].includes(rol)) {
      res.status(400).json({ success: false, error: 'Rol debe ser: admin, gerente o vendedor' });
      return;
    }
    try {
      const insertRes = await query(
        'INSERT INTO usuarios_sistema (id, nombre, email, rol) VALUES ($1, $2, $3, $4) RETURNING *',
        [id, nombre, email, rol],
      );
      res.status(201).json({ success: true, data: insertRes.rows[0] });
    } catch (error) {
      if (esDuplicado(error)) {
        res.status(409).json({ success: false, error: 'Ya existe un usuario con ese ID o email' });
        return;
      }
      throw error;
    }
  }),
);

// PUT /api/usuarios/:id
router.put(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { nombre, email, rol, activo } = req.body;

    // Validar rol si se proporciona
    if (rol && !['admin', 'gerente', 'vendedor'].includes(rol)) {
      res.status(400).json({ success: false, error: 'Rol debe ser: admin, gerente o vendedor' });
      return;
    }
    // Validar activo si se proporciona
    if (activo !== undefined && ![0, 1].includes(activo)) {
      res.status(400).json({ success: false, error: 'activo debe ser 0 o 1' });
      return;
    }

    const currentRes = await query<Usuario>('SELECT * FROM usuarios_sistema WHERE id = $1', [
      req.params.id,
    ]);
    const current = currentRes.rows[0];
    if (!current) {
      res.status(404).json({ success: false, error: 'Usuario no encontrado' });
      return;
    }

    const updatedRes = await query(
      'UPDATE usuarios_sistema SET nombre = $1, email = $2, rol = $3, activo = $4 WHERE id = $5 RETURNING *',
      [
        nombre ?? current.nombre,
        email ?? current.email,
        rol ?? current.rol,
        activo ?? current.activo,
        req.params.id,
      ],
    );
    res.json({ success: true, data: updatedRes.rows[0] });
  }),
);

// GET /api/usuarios/audit-log — Ver log de auditoría
router.get(
  '/audit-log',
  asyncHandler(async (req: Request, res: Response) => {
    const limit = Number(req.query.limit) || 50;
    const logsRes = await query('SELECT * FROM audit_log ORDER BY created_at DESC LIMIT $1', [
      limit,
    ]);
    res.json({ success: true, data: logsRes.rows });
  }),
);

export default router;
