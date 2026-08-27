/**
 * ROUTES — Usuarios del sistema
 */
import { Router, Request, Response } from 'express';
import { getDatabase } from '../db/connection.js';

const router = Router();

interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: string;
  activo: number;
  created_at: string;
}

// GET /api/usuarios
router.get('/', (_req: Request, res: Response) => {
  const db = getDatabase();
  const usuarios = db.prepare('SELECT * FROM usuarios_sistema ORDER BY nombre').all();
  res.json({ success: true, data: usuarios });
});

// POST /api/usuarios
router.post('/', (req: Request, res: Response) => {
  const { id, nombre, email, rol } = req.body;
  if (!id || !nombre || !email || !rol) {
    res.status(400).json({ success: false, error: 'id, nombre, email y rol son obligatorios' });
    return;
  }
  if (!['admin', 'gerente', 'vendedor'].includes(rol)) {
    res.status(400).json({ success: false, error: 'Rol debe ser: admin, gerente o vendedor' });
    return;
  }
  const db = getDatabase();
  try {
    db.prepare('INSERT INTO usuarios_sistema (id, nombre, email, rol) VALUES (?, ?, ?, ?)').run(
      id,
      nombre,
      email,
      rol,
    );
    const usuario = db.prepare('SELECT * FROM usuarios_sistema WHERE id = ?').get(id);
    res.status(201).json({ success: true, data: usuario });
  } catch {
    res.status(409).json({ success: false, error: 'Ya existe un usuario con ese ID o email' });
  }
});

// PUT /api/usuarios/:id
router.put('/:id', (req: Request, res: Response) => {
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

  const db = getDatabase();
  const current = db.prepare('SELECT * FROM usuarios_sistema WHERE id = ?').get(req.params.id) as
    | Usuario
    | undefined;
  if (!current) {
    res.status(404).json({ success: false, error: 'Usuario no encontrado' });
    return;
  }

  db.prepare(
    'UPDATE usuarios_sistema SET nombre = ?, email = ?, rol = ?, activo = ? WHERE id = ?',
  ).run(
    nombre ?? current.nombre,
    email ?? current.email,
    rol ?? current.rol,
    activo ?? current.activo,
    req.params.id,
  );
  const updated = db.prepare('SELECT * FROM usuarios_sistema WHERE id = ?').get(req.params.id);
  res.json({ success: true, data: updated });
});

// GET /api/usuarios/audit-log — Ver log de auditoría
router.get('/audit-log', (req: Request, res: Response) => {
  const db = getDatabase();
  const limit = Number(req.query.limit) || 50;
  const logs = db.prepare('SELECT * FROM audit_log ORDER BY created_at DESC LIMIT ?').all(limit);
  res.json({ success: true, data: logs });
});

export default router;
