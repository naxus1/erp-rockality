import { Router, Request, Response } from 'express';
import * as repo from '../repositories/proveedores.repository.js';
import { validate } from '../middleware/validate.js';
import { createProveedorSchema, updateProveedorSchema } from '../schemas/proveedores.schema.js';

const router = Router();

// GET /api/proveedores — Listar todos
router.get('/', (req: Request, res: Response) => {
  const includeInactive = req.query.incluir_inactivos === '1';
  const proveedores = repo.findAll(includeInactive);
  res.json({ success: true, data: proveedores });
});

// GET /api/proveedores/buscar?q=texto
router.get('/buscar', (req: Request, res: Response) => {
  const query = (req.query.q as string) || '';
  if (query.length < 2) {
    res.status(400).json({ success: false, error: 'La búsqueda debe tener al menos 2 caracteres' });
    return;
  }
  const proveedores = repo.search(query);
  res.json({ success: true, data: proveedores });
});

// GET /api/proveedores/:nit
router.get('/:nit', (req: Request, res: Response) => {
  const proveedor = repo.findByNit(req.params.nit);
  if (!proveedor) {
    res.status(404).json({ success: false, error: 'Proveedor no encontrado' });
    return;
  }
  res.json({ success: true, data: proveedor });
});

// POST /api/proveedores
router.post('/', validate(createProveedorSchema), (req: Request, res: Response) => {
  const existing = repo.findByNit(req.body.nit);
  if (existing) {
    res.status(409).json({ success: false, error: 'Ya existe un proveedor con ese NIT' });
    return;
  }
  const proveedor = repo.create(req.body);
  res.status(201).json({ success: true, data: proveedor });
});

// PUT /api/proveedores/:nit
router.put('/:nit', validate(updateProveedorSchema), (req: Request, res: Response) => {
  const proveedor = repo.update(req.params.nit, req.body);
  if (!proveedor) {
    res.status(404).json({ success: false, error: 'Proveedor no encontrado' });
    return;
  }
  res.json({ success: true, data: proveedor });
});

// DELETE /api/proveedores/:nit — Desactivar
router.delete('/:nit', (req: Request, res: Response) => {
  const deleted = repo.deactivate(req.params.nit);
  if (!deleted) {
    res.status(404).json({ success: false, error: 'Proveedor no encontrado' });
    return;
  }
  res.json({ success: true, message: 'Proveedor desactivado' });
});

export default router;
