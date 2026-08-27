import { z } from 'zod';

export const createGastoSchema = z.object({
  tercero_nit: z.string().min(5, 'El NIT/cédula del tercero es obligatorio'),
  gerencia_id: z.number().int().positive('La gerencia es obligatoria'),
  tipo_gasto_id: z.number().int().positive('El tipo de gasto es obligatorio'),
  categoria_gasto_id: z.number().int().positive('La categoría es obligatoria'),
  descripcion: z.string().min(3, 'La descripción debe tener al menos 3 caracteres').max(500),
  valor_base: z.number().int().positive('El valor base debe ser mayor a 0'),
  iva: z.number().int().min(0).optional(),
  periodo_mes: z.number().int().min(1).max(12, 'Mes inválido'),
  periodo_anio: z.number().int().min(2020).max(2050, 'Año inválido'),
  fecha_pago: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato: YYYY-MM-DD')
    .optional(),
  metodo_pago_id: z.number().int().positive().optional(),
  referencia_pago: z.string().max(100).optional(),
  notas: z.string().max(1000).optional(),
});

// Edición limitada: solo campos no contables (descripción, notas, referencia)
export const updateGastoSchema = z.object({
  descripcion: z
    .string()
    .min(3, 'La descripción debe tener al menos 3 caracteres')
    .max(500)
    .optional(),
  referencia_pago: z.string().max(100).optional(),
  notas: z.string().max(1000).optional(),
  updated_by: z.string().max(50).optional(),
});
