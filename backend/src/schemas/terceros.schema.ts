import { z } from 'zod';

export const createTerceroSchema = z.object({
  nit: z.string().min(5, 'El NIT/cédula debe tener al menos 5 caracteres').max(20),
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(200),
  tipo_tercero_id: z.number().int().positive('El tipo de tercero es obligatorio'),
  direccion: z.string().max(200).optional(),
  telefono: z.string().max(20).optional(),
  nombre_contacto: z.string().max(100).optional(),
  observaciones: z.string().max(1000).optional(),
});

export const updateTerceroSchema = z.object({
  nombre: z.string().min(2).max(200).optional(),
  tipo_tercero_id: z.number().int().positive().optional(),
  direccion: z.string().max(200).optional(),
  telefono: z.string().max(20).optional(),
  nombre_contacto: z.string().max(100).optional(),
  observaciones: z.string().max(1000).optional(),
});
