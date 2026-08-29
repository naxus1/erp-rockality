import { z } from 'zod';
import { toUpper } from './text.js';

export const createPlanSchema = z.object({
  nombre: z
    .string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(200)
    .transform(toUpper),
  modalidad: z.enum(['presencial', 'virtual', 'mixto']),
  duracion_dias: z.number().int().positive('La duración debe ser mayor a 0'),
  precio: z.number().int().positive('El precio debe ser mayor a 0'),
  aplica_iva: z.number().int().min(0).max(1).optional(),
  porcentaje_iva: z.number().int().min(0).max(100).optional(),
  descripcion: z.string().max(500).transform(toUpper).optional(),
});

export const updatePlanSchema = z.object({
  nombre: z.string().min(2).max(200).transform(toUpper).optional(),
  modalidad: z.enum(['presencial', 'virtual', 'mixto']).optional(),
  duracion_dias: z.number().int().positive().optional(),
  precio: z.number().int().positive().optional(),
  aplica_iva: z.number().int().min(0).max(1).optional(),
  porcentaje_iva: z.number().int().min(0).max(100).optional(),
  descripcion: z.string().max(500).transform(toUpper).optional(),
  activo: z.number().int().min(0).max(1).optional(),
  motivo_inactivacion: z.string().max(500).transform(toUpper).nullable().optional(),
});

// Crear suscripción directa (usado para cortesía: monto_pagado 0, sin venta)
export const createSuscripcionSchema = z.object({
  cliente_cedula: z.string().min(5, 'La cédula del cliente es obligatoria').max(20),
  plan_id: z.number().int().positive('El plan es obligatorio'),
  monto_pagado: z.number().int().min(0).optional(),
  notas: z.string().max(1000).transform(toUpper).optional(),
});
