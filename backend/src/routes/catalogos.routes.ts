/**
 * ROUTES — Catálogos
 *
 * CRUD genérico para tablas catálogo.
 * Soporta: listar, agregar, editar nombre, desactivar (no eliminar).
 */
import { Router, Request, Response } from 'express';
import { getDatabase } from '../db/connection.js';

const router = Router();

// Tablas catálogo soportadas y sus configuraciones
const CATALOGOS: Record<string, { tabla: string; hasActivo?: boolean }> = {
  sexos: { tabla: 'sexos' },
  ciudades: { tabla: 'ciudades' },
  'canales-captacion': { tabla: 'canales_captacion' },
  'unidades-medida': { tabla: 'unidades_medida' },
  'metodos-pago': { tabla: 'metodos_pago' },
  'tipos-tercero': { tabla: 'tipos_tercero' },
  gerencias: { tabla: 'gerencias' },
  'tipos-gasto': { tabla: 'tipos_gasto' },
  'categorias-gasto': { tabla: 'categorias_gasto' },
};

// GET /api/catalogos/:catalogo — Listar
router.get('/:catalogo', (req: Request, res: Response) => {
  const config = CATALOGOS[req.params.catalogo];
  if (!config) {
    // Manejar planes aparte
    if (req.params.catalogo === 'planes') {
      const db = getDatabase();
      const data = db.prepare('SELECT * FROM planes WHERE activo = 1 ORDER BY nombre').all();
      res.json({ success: true, data });
      return;
    }
    res.status(404).json({ success: false, error: 'Catálogo no encontrado' });
    return;
  }
  const db = getDatabase();
  const data = db.prepare(`SELECT * FROM ${config.tabla} ORDER BY nombre`).all();
  res.json({ success: true, data });
});

// POST /api/catalogos/:catalogo — Agregar item
router.post('/:catalogo', (req: Request, res: Response) => {
  const config = CATALOGOS[req.params.catalogo];
  if (!config) {
    res.status(404).json({ success: false, error: 'Catálogo no encontrado' });
    return;
  }

  const { nombre } = req.body;
  if (!nombre || nombre.length < 2) {
    res.status(400).json({ success: false, error: 'El nombre es obligatorio (mín 2 caracteres)' });
    return;
  }

  const db = getDatabase();
  try {
    const result = db.prepare(`INSERT INTO ${config.tabla} (nombre) VALUES (?)`).run(nombre);
    const item = db
      .prepare(`SELECT * FROM ${config.tabla} WHERE id = ?`)
      .get(Number(result.lastInsertRowid));
    res.status(201).json({ success: true, data: item });
  } catch {
    res
      .status(409)
      .json({ success: false, error: `"${nombre}" ya existe en ${req.params.catalogo}` });
  }
});

// PUT /api/catalogos/:catalogo/:id — Editar nombre
router.put('/:catalogo/:id', (req: Request, res: Response) => {
  const config = CATALOGOS[req.params.catalogo];
  if (!config) {
    res.status(404).json({ success: false, error: 'Catálogo no encontrado' });
    return;
  }

  const { nombre } = req.body;
  if (!nombre || nombre.length < 2) {
    res.status(400).json({ success: false, error: 'El nombre es obligatorio (mín 2 caracteres)' });
    return;
  }

  const db = getDatabase();
  const existing = db
    .prepare(`SELECT * FROM ${config.tabla} WHERE id = ?`)
    .get(Number(req.params.id));
  if (!existing) {
    res.status(404).json({ success: false, error: 'Item no encontrado' });
    return;
  }

  try {
    db.prepare(`UPDATE ${config.tabla} SET nombre = ? WHERE id = ?`).run(
      nombre,
      Number(req.params.id),
    );
    const updated = db
      .prepare(`SELECT * FROM ${config.tabla} WHERE id = ?`)
      .get(Number(req.params.id));
    res.json({ success: true, data: updated });
  } catch {
    res.status(409).json({ success: false, error: `"${nombre}" ya existe` });
  }
});

// DELETE /api/catalogos/:catalogo/:id — Desactivar (no eliminar)
// Nota: como las tablas catálogo no tienen campo "activo", lo que hacemos es
// agregar un sufijo "(inactivo)" al nombre para que no aparezca en selects normales.
// Alternativa: no permitir desactivar catálogos base.
router.delete('/:catalogo/:id', (req: Request, res: Response) => {
  const config = CATALOGOS[req.params.catalogo];
  if (!config) {
    res.status(404).json({ success: false, error: 'Catálogo no encontrado' });
    return;
  }

  const db = getDatabase();
  const existing = db
    .prepare(`SELECT * FROM ${config.tabla} WHERE id = ?`)
    .get(Number(req.params.id)) as { id: number; nombre: string } | undefined;
  if (!existing) {
    res.status(404).json({ success: false, error: 'Item no encontrado' });
    return;
  }

  // Verificar si tiene registros asociados (no se puede eliminar)
  // En vez de eliminar, renombramos con sufijo
  const nuevoNombre = existing.nombre.includes('(inactivo)')
    ? existing.nombre
    : `${existing.nombre} (inactivo)`;
  db.prepare(`UPDATE ${config.tabla} SET nombre = ? WHERE id = ?`).run(
    nuevoNombre,
    Number(req.params.id),
  );
  res.json({ success: true, message: `"${existing.nombre}" marcado como inactivo` });
});

// PATCH /api/catalogos/:catalogo/:id/activar — Reactivar un item inactivo
router.patch('/:catalogo/:id/activar', (req: Request, res: Response) => {
  const config = CATALOGOS[req.params.catalogo];
  if (!config) {
    res.status(404).json({ success: false, error: 'Catálogo no encontrado' });
    return;
  }

  const db = getDatabase();
  const existing = db
    .prepare(`SELECT * FROM ${config.tabla} WHERE id = ?`)
    .get(Number(req.params.id)) as { id: number; nombre: string } | undefined;
  if (!existing) {
    res.status(404).json({ success: false, error: 'Item no encontrado' });
    return;
  }

  const nombreLimpio = existing.nombre.replace(' (inactivo)', '');
  db.prepare(`UPDATE ${config.tabla} SET nombre = ? WHERE id = ?`).run(
    nombreLimpio,
    Number(req.params.id),
  );
  res.json({ success: true, data: { id: existing.id, nombre: nombreLimpio } });
});

export default router;
