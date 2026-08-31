import { z } from 'zod';
import { toUpper, toClean } from './text.js';

export const createClienteSchema = z.object({
  cedula: z
    .string()
    .min(5, 'La cédula debe tener al menos 5 caracteres')
    .max(20)
    .transform(toClean),
  nombre: z
    .string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(100)
    .transform(toUpper),
  apellidos: z
    .string()
    .min(2, 'Los apellidos deben tener al menos 2 caracteres')
    .max(100)
    .transform(toUpper),
  telefono: z.string().min(7, 'El teléfono es obligatorio').max(20).transform(toClean),
  email: z.string().trim().toLowerCase().email('Email inválido'),
  fecha_nacimiento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha: YYYY-MM-DD'),
  direccion: z.string().max(200).transform(toUpper).optional(),
  ciudad_id: z.number().int().positive().optional(),
  sexo_id: z.number().int().positive().optional(),
  canal_captacion_id: z.number().int().positive('El canal de captación es obligatorio'),
  consentimiento_datos: z.number().int().min(0).max(1).optional(),
  notas: z.string().max(1000).transform(toUpper).optional(),
  notas_salud: z.string().max(1000).transform(toUpper).optional(),
  instagram: z.string().max(100).transform(toClean).optional(),
  linkedin: z.string().max(200).transform(toClean).optional(),
  whatsapp: z.string().max(50).transform(toClean).optional(),
  hace_ejercicio: z.number().int().min(0).max(1).optional(),
  referido_por: z.string().max(20).transform(toClean).optional(),
  referido_por_nombre: z.string().max(150).transform(toUpper).optional(),
});

export const updateClienteSchema = z.object({
  nombre: z.string().min(2).max(100).transform(toUpper).optional(),
  apellidos: z.string().min(2).max(100).transform(toUpper).optional(),
  telefono: z.string().min(7).max(20).transform(toClean).optional(),
  email: z.string().trim().toLowerCase().email('Email inválido').optional(),
  fecha_nacimiento: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha: YYYY-MM-DD')
    .optional(),
  direccion: z.string().max(200).transform(toUpper).optional(),
  ciudad_id: z.number().int().positive().optional(),
  sexo_id: z.number().int().positive().optional(),
  canal_captacion_id: z.number().int().positive().optional(),
  consentimiento_datos: z.number().int().min(0).max(1).optional(),
  notas: z.string().max(1000).transform(toUpper).optional(),
  notas_salud: z.string().max(1000).transform(toUpper).optional(),
  instagram: z.string().max(100).transform(toClean).optional(),
  linkedin: z.string().max(200).transform(toClean).optional(),
  whatsapp: z.string().max(50).transform(toClean).optional(),
  hace_ejercicio: z.number().int().min(0).max(1).optional(),
  referido_por: z.string().max(20).transform(toClean).optional(),
  referido_por_nombre: z.string().max(150).transform(toUpper).optional(),
});
