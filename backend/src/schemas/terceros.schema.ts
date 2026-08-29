import { z } from 'zod';
import { toUpper, toClean } from './text.js';

export const createTerceroSchema = z.object({
  nit: z
    .string()
    .min(5, 'El NIT/cédula debe tener al menos 5 caracteres')
    .max(20)
    .transform(toClean),
  nombre: z
    .string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(200)
    .transform(toUpper),
  tipo_tercero_id: z.number().int().positive('El tipo de tercero es obligatorio'),
  direccion: z.string().max(200).transform(toUpper).optional(),
  telefono: z.string().max(20).transform(toClean).optional(),
  nombre_contacto: z.string().max(100).transform(toUpper).optional(),
  observaciones: z.string().max(1000).transform(toUpper).optional(),
});

export const updateTerceroSchema = z.object({
  nombre: z.string().min(2).max(200).transform(toUpper).optional(),
  tipo_tercero_id: z.number().int().positive().optional(),
  direccion: z.string().max(200).transform(toUpper).optional(),
  telefono: z.string().max(20).transform(toClean).optional(),
  nombre_contacto: z.string().max(100).transform(toUpper).optional(),
  observaciones: z.string().max(1000).transform(toUpper).optional(),
});
