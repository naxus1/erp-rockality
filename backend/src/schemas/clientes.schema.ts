import { z } from 'zod';

export const createClienteSchema = z.object({
  cedula: z.string().min(5, 'La cédula debe tener al menos 5 caracteres').max(20),
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(100),
  apellidos: z.string().min(2, 'Los apellidos deben tener al menos 2 caracteres').max(100),
  telefono: z.string().max(20).optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  fecha_nacimiento: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha: YYYY-MM-DD')
    .optional(),
  direccion: z.string().max(200).optional(),
  ciudad_id: z.number().int().positive().optional(),
  sexo_id: z.number().int().positive().optional(),
  canal_captacion_id: z.number().int().positive().optional(),
  consentimiento_datos: z.number().int().min(0).max(1).optional(),
  notas: z.string().max(1000).optional(),
  notas_salud: z.string().max(1000).optional(),
});

export const updateClienteSchema = z.object({
  nombre: z.string().min(2).max(100).optional(),
  apellidos: z.string().min(2).max(100).optional(),
  telefono: z.string().max(20).optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  fecha_nacimiento: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha: YYYY-MM-DD')
    .optional(),
  direccion: z.string().max(200).optional(),
  ciudad_id: z.number().int().positive().optional(),
  sexo_id: z.number().int().positive().optional(),
  canal_captacion_id: z.number().int().positive().optional(),
  consentimiento_datos: z.number().int().min(0).max(1).optional(),
  notas: z.string().max(1000).optional(),
  notas_salud: z.string().max(1000).optional(),
});
