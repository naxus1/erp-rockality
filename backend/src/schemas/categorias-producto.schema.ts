import { z } from 'zod';
import { toUpper } from './text.js';

export const createCategoriaSchema = z.object({
  nombre: z
    .string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(100)
    .transform(toUpper),
  descripcion: z.string().max(500).transform(toUpper).optional(),
});

export const updateCategoriaSchema = z.object({
  nombre: z.string().min(2).max(100).transform(toUpper).optional(),
  descripcion: z.string().max(500).transform(toUpper).optional(),
});
