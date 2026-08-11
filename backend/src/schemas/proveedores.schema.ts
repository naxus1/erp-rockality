import { z } from 'zod';

export const createProveedorSchema = z.object({
  nit: z.string().min(5, 'El NIT debe tener al menos 5 caracteres').max(20),
  nombre_empresa: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(200),
  direccion: z.string().max(200).optional(),
  telefono: z.string().max(20).optional(),
  nombre_contacto: z.string().max(100).optional(),
  observaciones: z.string().max(1000).optional(),
});

export const updateProveedorSchema = z.object({
  nombre_empresa: z.string().min(2).max(200).optional(),
  direccion: z.string().max(200).optional(),
  telefono: z.string().max(20).optional(),
  nombre_contacto: z.string().max(100).optional(),
  observaciones: z.string().max(1000).optional(),
});
