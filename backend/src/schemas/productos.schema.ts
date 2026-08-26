import { z } from 'zod';

export const createProductoSchema = z.object({
  sku: z.string().min(2).max(50).optional(), // opcional: se autogenera
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(200),
  categoria_id: z.number().int().positive('La categoría es obligatoria'),
  unidad_medida_id: z.number().int().positive('La unidad de medida es obligatoria'),
  proveedor_nit: z.string().max(20).optional(),
  variante: z.string().max(100).optional(),
  notas: z.string().max(500).optional(),
  precio_venta: z.number().int().positive('El precio de venta debe ser mayor a 0'),
  precio_costo: z.number().int().min(0, 'El precio de costo no puede ser negativo'),
  stock_actual: z.number().int().min(0).optional(),
  stock_minimo: z.number().int().min(0).optional(),
  aplica_iva: z.number().int().min(0).max(1).optional(),
  porcentaje_iva: z.number().int().min(0).max(100).optional(),
});

export const updateProductoSchema = z.object({
  nombre: z.string().min(2).max(200).optional(),
  categoria_id: z.number().int().positive().optional(),
  unidad_medida_id: z.number().int().positive().optional(),
  proveedor_nit: z.string().max(20).optional(),
  variante: z.string().max(100).optional(),
  notas: z.string().max(500).optional(),
  precio_venta: z.number().int().positive().optional(),
  precio_costo: z.number().int().min(0).optional(),
  stock_actual: z.number().int().min(0).optional(),
  stock_minimo: z.number().int().min(0).optional(),
  aplica_iva: z.number().int().min(0).max(1).optional(),
  porcentaje_iva: z.number().int().min(0).max(100).optional(),
  activo: z.number().int().min(0).max(1).optional(),
});
