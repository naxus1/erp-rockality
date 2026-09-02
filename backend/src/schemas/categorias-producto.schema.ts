import { z } from 'zod';
import { toUpper, toCatalogo } from './text.js';

// El NOMBRE de la categoría es un valor de catálogo: MAYÚSCULAS sin tildes
// (evita repetidos por acento/mayúsculas). La DESCRIPCIÓN es texto libre:
// MAYÚSCULAS pero CONSERVA tildes (toUpper).
export const createCategoriaSchema = z.object({
  nombre: z
    .string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(100)
    .transform(toCatalogo),
  descripcion: z.string().max(500).transform(toUpper).optional(),
});

export const updateCategoriaSchema = z.object({
  nombre: z.string().min(2).max(100).transform(toCatalogo).optional(),
  descripcion: z.string().max(500).transform(toUpper).optional(),
});
