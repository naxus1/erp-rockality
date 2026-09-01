/**
 * ROUTES — Catálogos
 *
 * CRUD genérico para tablas catálogo.
 * Soporta: listar, agregar, editar nombre, desactivar (no eliminar).
 */
import { Router, Request, Response } from 'express';
import { query } from '../db/connection.js';
import { asyncHandler } from '../middleware/async-handler.js';
import { toUpper } from '../schemas/text.js';

const router = Router();

// Tablas catálogo soportadas y sus configuraciones.
// Los nombres de tabla salen de esta whitelist fija (nunca de entrada del
// usuario), por eso se pueden interpolar en el SQL sin riesgo de inyección.
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
  'variantes-producto': { tabla: 'variantes_producto' },
};

/** ¿El error de pg es una violación de restricción única (nombre duplicado)? */
function esDuplicado(error: unknown): boolean {
  return (
    typeof error === 'object' && error !== null && (error as { code?: string }).code === '23505'
  );
}

// GET /api/catalogos/:catalogo — Listar
router.get(
  '/:catalogo',
  asyncHandler(async (req: Request, res: Response) => {
    const catalogo = typeof req.params.catalogo === 'string' ? req.params.catalogo : '';
    const config = CATALOGOS[catalogo];
    if (!config) {
      // Manejar planes aparte
      if (catalogo === 'planes') {
        const planesRes = await query('SELECT * FROM planes WHERE activo = 1 ORDER BY nombre');
        res.json({ success: true, data: planesRes.rows });
        return;
      }
      res.status(404).json({ success: false, error: 'Catálogo no encontrado' });
      return;
    }
    const dataRes = await query(`SELECT * FROM ${config.tabla} ORDER BY nombre`);
    res.json({ success: true, data: dataRes.rows });
  }),
);

// POST /api/catalogos/:catalogo — Agregar item
router.post(
  '/:catalogo',
  asyncHandler(async (req: Request, res: Response) => {
    const catalogo = typeof req.params.catalogo === 'string' ? req.params.catalogo : '';
    const config = CATALOGOS[catalogo];
    if (!config) {
      res.status(404).json({ success: false, error: 'Catálogo no encontrado' });
      return;
    }

    const nombreRaw = req.body.nombre;
    if (typeof nombreRaw !== 'string' || nombreRaw.trim().length < 2) {
      res
        .status(400)
        .json({ success: false, error: 'El nombre es obligatorio (mín 2 caracteres)' });
      return;
    }
    const nombre = toUpper(nombreRaw);

    try {
      const insertRes = await query(
        `INSERT INTO ${config.tabla} (nombre) VALUES ($1) RETURNING *`,
        [nombre],
      );
      res.status(201).json({ success: true, data: insertRes.rows[0] });
    } catch (error) {
      if (esDuplicado(error)) {
        res.status(409).json({ success: false, error: `"${nombre}" ya existe en ${catalogo}` });
        return;
      }
      throw error;
    }
  }),
);

// PUT /api/catalogos/:catalogo/:id — Editar nombre
router.put(
  '/:catalogo/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const catalogo = typeof req.params.catalogo === 'string' ? req.params.catalogo : '';
    const config = CATALOGOS[catalogo];
    if (!config) {
      res.status(404).json({ success: false, error: 'Catálogo no encontrado' });
      return;
    }

    const nombreRaw = req.body.nombre;
    if (typeof nombreRaw !== 'string' || nombreRaw.trim().length < 2) {
      res
        .status(400)
        .json({ success: false, error: 'El nombre es obligatorio (mín 2 caracteres)' });
      return;
    }
    const nombre = toUpper(nombreRaw);

    const existingRes = await query(`SELECT * FROM ${config.tabla} WHERE id = $1`, [
      Number(req.params.id),
    ]);
    if (!existingRes.rows[0]) {
      res.status(404).json({ success: false, error: 'Item no encontrado' });
      return;
    }

    try {
      const updatedRes = await query(
        `UPDATE ${config.tabla} SET nombre = $1 WHERE id = $2 RETURNING *`,
        [nombre, Number(req.params.id)],
      );
      res.json({ success: true, data: updatedRes.rows[0] });
    } catch (error) {
      if (esDuplicado(error)) {
        res.status(409).json({ success: false, error: `"${nombre}" ya existe` });
        return;
      }
      throw error;
    }
  }),
);

// DELETE /api/catalogos/:catalogo/:id — Desactivar (no eliminar)
// Nota: como las tablas catálogo no tienen campo "activo", lo que hacemos es
// agregar un sufijo "(inactivo)" al nombre para que no aparezca en selects normales.
router.delete(
  '/:catalogo/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const catalogo = typeof req.params.catalogo === 'string' ? req.params.catalogo : '';
    const config = CATALOGOS[catalogo];
    if (!config) {
      res.status(404).json({ success: false, error: 'Catálogo no encontrado' });
      return;
    }

    const existingRes = await query<{ id: number; nombre: string }>(
      `SELECT * FROM ${config.tabla} WHERE id = $1`,
      [Number(req.params.id)],
    );
    const existing = existingRes.rows[0];
    if (!existing) {
      res.status(404).json({ success: false, error: 'Item no encontrado' });
      return;
    }

    // En vez de eliminar, renombramos con sufijo
    const nuevoNombre = existing.nombre.includes('(inactivo)')
      ? existing.nombre
      : `${existing.nombre} (inactivo)`;
    await query(`UPDATE ${config.tabla} SET nombre = $1 WHERE id = $2`, [
      nuevoNombre,
      Number(req.params.id),
    ]);
    res.json({ success: true, message: `"${existing.nombre}" marcado como inactivo` });
  }),
);

// PATCH /api/catalogos/:catalogo/:id/activar — Reactivar un item inactivo
router.patch(
  '/:catalogo/:id/activar',
  asyncHandler(async (req: Request, res: Response) => {
    const catalogo = typeof req.params.catalogo === 'string' ? req.params.catalogo : '';
    const config = CATALOGOS[catalogo];
    if (!config) {
      res.status(404).json({ success: false, error: 'Catálogo no encontrado' });
      return;
    }

    const existingRes = await query<{ id: number; nombre: string }>(
      `SELECT * FROM ${config.tabla} WHERE id = $1`,
      [Number(req.params.id)],
    );
    const existing = existingRes.rows[0];
    if (!existing) {
      res.status(404).json({ success: false, error: 'Item no encontrado' });
      return;
    }

    const nombreLimpio = existing.nombre.replace(' (inactivo)', '');
    await query(`UPDATE ${config.tabla} SET nombre = $1 WHERE id = $2`, [
      nombreLimpio,
      Number(req.params.id),
    ]);
    res.json({ success: true, data: { id: existing.id, nombre: nombreLimpio } });
  }),
);

export default router;
