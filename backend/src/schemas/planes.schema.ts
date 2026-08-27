import { z } from 'zod';

export const createPlanSchema = z.object({
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(200),
  modalidad: z.enum(['presencial', 'virtual', 'mixto']),
  duracion_dias: z.number().int().positive('La duración debe ser mayor a 0'),
  precio: z.number().int().positive('El precio debe ser mayor a 0'),
  aplica_iva: z.number().int().min(0).max(1).optional(),
  porcentaje_iva: z.number().int().min(0).max(100).optional(),
  descripcion: z.string().max(500).optional(),
});

export const updatePlanSchema = z.object({
  nombre: z.string().min(2).max(200).optional(),
  modalidad: z.enum(['presencial', 'virtual', 'mixto']).optional(),
  duracion_dias: z.number().int().positive().optional(),
  precio: z.number().int().positive().optional(),
  aplica_iva: z.number().int().min(0).max(1).optional(),
  porcentaje_iva: z.number().int().min(0).max(100).optional(),
  descripcion: z.string().max(500).optional(),
  activo: z.number().int().min(0).max(1).optional(),
  motivo_inactivacion: z.string().max(500).nullable().optional(),
});
