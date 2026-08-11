/**
 * ROUTES — Catálogos
 *
 * Endpoints para listar las tablas catálogo (dropdowns del frontend).
 * Son de solo lectura — los datos se cargan via migraciones.
 */
import { Router, Request, Response } from 'express';
import { getDatabase } from '../db/connection.js';

const router = Router();

// GET /api/catalogos/sexos
router.get('/sexos', (_req: Request, res: Response) => {
  const db = getDatabase();
  const data = db.prepare('SELECT * FROM sexos ORDER BY id').all();
  res.json({ success: true, data });
});

// GET /api/catalogos/ciudades
router.get('/ciudades', (_req: Request, res: Response) => {
  const db = getDatabase();
  const data = db.prepare('SELECT * FROM ciudades ORDER BY nombre').all();
  res.json({ success: true, data });
});

// GET /api/catalogos/canales-captacion
router.get('/canales-captacion', (_req: Request, res: Response) => {
  const db = getDatabase();
  const data = db.prepare('SELECT * FROM canales_captacion ORDER BY nombre').all();
  res.json({ success: true, data });
});

// GET /api/catalogos/unidades-medida
router.get('/unidades-medida', (_req: Request, res: Response) => {
  const db = getDatabase();
  const data = db.prepare('SELECT * FROM unidades_medida ORDER BY nombre').all();
  res.json({ success: true, data });
});

// GET /api/catalogos/metodos-pago
router.get('/metodos-pago', (_req: Request, res: Response) => {
  const db = getDatabase();
  const data = db.prepare('SELECT * FROM metodos_pago ORDER BY nombre').all();
  res.json({ success: true, data });
});

// POST /api/catalogos/ciudades — Agregar ciudad nueva
router.post('/ciudades', (req: Request, res: Response) => {
  const { nombre } = req.body;
  if (!nombre || nombre.length < 2) {
    res
      .status(400)
      .json({ success: false, error: 'El nombre de la ciudad es obligatorio (mín 2 caracteres)' });
    return;
  }
  const db = getDatabase();
  try {
    const result = db.prepare('INSERT INTO ciudades (nombre) VALUES (?)').run(nombre);
    const ciudad = db
      .prepare('SELECT * FROM ciudades WHERE id = ?')
      .get(Number(result.lastInsertRowid));
    res.status(201).json({ success: true, data: ciudad });
  } catch {
    res.status(409).json({ success: false, error: 'La ciudad ya existe' });
  }
});

export default router;
