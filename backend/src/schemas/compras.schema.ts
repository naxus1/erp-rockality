import { z } from 'zod';
import { toUpper, toClean } from './text.js';

const detalleCompraItem = z.object({
  producto_sku: z.string().min(2).transform(toUpper),
  cantidad: z.number().int().positive('La cantidad debe ser mayor a 0'),
  precio_unitario: z.number().int().positive('El precio debe ser mayor a 0'),
});

export const createCompraSchema = z.object({
  tercero_nit: z.string().min(5, 'El NIT del proveedor es obligatorio').transform(toClean),
  fecha: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  factura_proveedor: z.string().max(50).transform(toClean).optional(),
  items: z.array(detalleCompraItem).min(1, 'La compra debe tener al menos un producto'),
  iva: z.number().int().min(0).optional(),
  gerencia_id: z.number().int().positive().optional(),
  tipo_gasto_id: z.number().int().positive().optional(),
  categoria_gasto_id: z.number().int().positive().optional(),
  metodo_pago_id: z.number().int().positive().optional(),
  notas: z.string().max(500).transform(toUpper).optional(),
});
