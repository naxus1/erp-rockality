import { z } from 'zod';
import { toUpper, toClean } from './text.js';

export const createPagoSchema = z.object({
  venta_id: z.number().int().positive('La venta es obligatoria'),
  monto: z.number().int().positive('El monto debe ser mayor a 0'),
  metodo_pago_id: z.number().int().positive('El método de pago es obligatorio'),
  referencia: z.string().max(100).transform(toClean).optional(),
  notas: z.string().max(500).transform(toUpper).optional(),
});
