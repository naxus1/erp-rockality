import { z } from 'zod';
import { toUpper, toClean } from './text.js';

const detalleItemSchema = z.object({
  tipo_item: z.enum(['producto', 'plan']),
  producto_sku: z.string().transform(toUpper).optional(),
  plan_id: z.number().int().positive().optional(),
  cantidad: z.number().int().positive('La cantidad debe ser mayor a 0'),
  precio_unitario: z.number().int().positive('El precio debe ser mayor a 0'),
});

export const createVentaSchema = z.object({
  cliente_cedula: z.string().min(5).transform(toClean).optional(),
  tipo: z.enum(['nueva', 'recompra', 'historico']),
  items: z.array(detalleItemSchema).min(1, 'La venta debe tener al menos un item'),
  notas: z.string().max(500).transform(toUpper).optional(),
  pago_inmediato: z
    .object({
      monto: z.number().int().positive(),
      metodo_pago_id: z.number().int().positive(),
      referencia: z.string().max(100).transform(toClean).optional(),
    })
    .optional(),
});
