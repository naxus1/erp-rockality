import { Router, Request, Response } from 'express';
import * as repo from '../repositories/clientes.repository.js';
import * as suscRepo from '../repositories/suscripciones.repository.js';
import { query } from '../db/connection.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/async-handler.js';
import { createClienteSchema, updateClienteSchema } from '../schemas/clientes.schema.js';

const router = Router();

// GET /api/clientes — Listar todos (activos)
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const includeInactive = req.query.incluir_inactivos === '1';
    const clientes = await repo.findAll(includeInactive);
    res.json({ success: true, data: clientes });
  }),
);

// GET /api/clientes/buscar?q=texto — Buscar por nombre/apellidos/teléfono/cédula
router.get(
  '/buscar',
  asyncHandler(async (req: Request, res: Response) => {
    const q = (req.query.q as string) || '';
    if (q.length < 2) {
      res
        .status(400)
        .json({ success: false, error: 'La búsqueda debe tener al menos 2 caracteres' });
      return;
    }
    const clientes = await repo.search(q);
    res.json({ success: true, data: clientes });
  }),
);

// GET /api/clientes/:cedula — Obtener uno por cédula
router.get(
  '/:cedula',
  asyncHandler(async (req: Request, res: Response) => {
    const cedula = typeof req.params.cedula === 'string' ? req.params.cedula : '';
    const cliente = await repo.findByCedula(cedula);
    if (!cliente) {
      res.status(404).json({ success: false, error: 'Cliente no encontrado' });
      return;
    }
    res.json({ success: true, data: cliente });
  }),
);

// POST /api/clientes — Crear
router.post(
  '/',
  validate(createClienteSchema),
  asyncHandler(async (req: Request, res: Response) => {
    // Verificar que la cédula no existe
    const existing = await repo.findByCedula(req.body.cedula);
    if (existing) {
      res.status(409).json({ success: false, error: 'Ya existe un cliente con esa cédula' });
      return;
    }
    const cliente = await repo.create(req.body);
    res.status(201).json({ success: true, data: cliente });
  }),
);

// PUT /api/clientes/:cedula — Editar
router.put(
  '/:cedula',
  validate(updateClienteSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const cedula = typeof req.params.cedula === 'string' ? req.params.cedula : '';
    const cliente = await repo.update(cedula, req.body);
    if (!cliente) {
      res.status(404).json({ success: false, error: 'Cliente no encontrado' });
      return;
    }
    res.json({ success: true, data: cliente });
  }),
);

// DELETE /api/clientes/:cedula — Desactivar (soft delete)
router.delete(
  '/:cedula',
  asyncHandler(async (req: Request, res: Response) => {
    const cedula = typeof req.params.cedula === 'string' ? req.params.cedula : '';
    const deleted = await repo.deactivate(cedula);
    if (!deleted) {
      res.status(404).json({ success: false, error: 'Cliente no encontrado' });
      return;
    }
    res.json({ success: true, message: 'Cliente desactivado' });
  }),
);

// GET /api/clientes/:cedula/ficha — Ficha completa del cliente
router.get(
  '/:cedula/ficha',
  asyncHandler(async (req: Request, res: Response) => {
    const cedula = typeof req.params.cedula === 'string' ? req.params.cedula : '';
    const cliente = await repo.findByCedula(cedula);
    if (!cliente) {
      res.status(404).json({ success: false, error: 'Cliente no encontrado' });
      return;
    }

    const ventasRes = await query(
      'SELECT id, fecha, total, estado, tipo FROM ventas WHERE cliente_cedula = $1 ORDER BY fecha DESC',
      [cedula],
    );
    const suscripcionesRes = await query(
      `SELECT s.*, p.nombre as plan_nombre, p.modalidad as plan_modalidad,
         (s.fecha_fin::date - CURRENT_DATE) as dias_restantes
       FROM suscripciones s JOIN planes p ON s.plan_id = p.id
       WHERE s.cliente_cedula = $1 ORDER BY s.fecha_inicio DESC`,
      [cedula],
    );

    // Quién lo refirió (si referido_por es la cédula de un cliente)
    let referido_por_cliente: { cedula: string; nombre: string; apellidos: string } | null = null;
    if (cliente.referido_por) {
      const refRes = await query<{ cedula: string; nombre: string; apellidos: string }>(
        'SELECT cedula, nombre, apellidos FROM clientes WHERE cedula = $1',
        [cliente.referido_por],
      );
      referido_por_cliente = refRes.rows[0] || null;
    }

    // A quiénes ha referido este cliente
    const referidosRes = await query(
      'SELECT cedula, nombre, apellidos FROM clientes WHERE referido_por = $1 ORDER BY nombre, apellidos',
      [cedula],
    );

    const cortesias_count = await suscRepo.contarCortesias(cedula);

    res.json({
      success: true,
      data: {
        cliente,
        ventas: ventasRes.rows,
        suscripciones: suscripcionesRes.rows,
        referido_por_cliente,
        referidos: referidosRes.rows,
        cortesias_count,
      },
    });
  }),
);

router.post(
  '/:cedula/anonimizar',
  asyncHandler(async (req: Request, res: Response) => {
    const cedula = typeof req.params.cedula === 'string' ? req.params.cedula : '';
    const result = await repo.anonimizar(cedula);
    if (!result) {
      res.status(404).json({ success: false, error: 'Cliente no encontrado' });
      return;
    }
    res.json({ success: true, message: 'Datos del cliente anonimizados exitosamente' });
  }),
);

export default router;
