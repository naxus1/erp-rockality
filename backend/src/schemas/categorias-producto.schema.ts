import { z } from 'zod';

export const createCategoriaSchema = z.object({
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(100),
  descripcion: z.string().max(500).optional(),
});

export const updateCategoriaSchema = z.object({
  nombre: z.string().min(2).max(100).optional(),
  descripcion: z.string().max(500).optional(),
});
