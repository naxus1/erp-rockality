import { z } from 'zod';

export const createClienteSchema = z.object({
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(200),
  telefono: z.string().max(20).optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  notas: z.string().max(1000).optional(),
  consentimiento_datos: z.number().int().min(0).max(1).optional(),
});

export const updateClienteSchema = z.object({
  nombre: z.string().min(2).max(200).optional(),
  telefono: z.string().max(20).optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  notas: z.string().max(1000).optional(),
  consentimiento_datos: z.number().int().min(0).max(1).optional(),
});
