import { z } from 'zod';
import { toUpper } from './text.js';

// Abrir sesión: saldo inicial opcional (centavos, >= 0)
export const abrirSesionSchema = z.object({
  saldo_inicial: z.number().int().min(0, 'El saldo inicial no puede ser negativo').optional(),
  notas_apertura: z.string().max(500).transform(toUpper).optional(),
});

// Movimiento manual: retiro/ingreso/ajuste. 'egreso' también permitido (faltante,
// pago menor en efectivo). El motivo es obligatorio para movimientos manuales.
export const movimientoManualSchema = z.object({
  tipo: z.enum(['ingreso', 'egreso', 'retiro', 'ajuste'], {
    errorMap: () => ({ message: 'Tipo inválido (ingreso, egreso, retiro o ajuste)' }),
  }),
  monto: z.number().int().positive('El monto debe ser mayor a 0'),
  motivo: z
    .string()
    .min(3, 'El motivo es obligatorio (mín 3 caracteres)')
    .max(500)
    .transform(toUpper),
});

// Cerrar sesión: efectivo contado en el arqueo (centavos, >= 0)
export const cerrarSesionSchema = z.object({
  saldo_contado: z.number().int().min(0, 'El efectivo contado no puede ser negativo'),
  notas_cierre: z.string().max(500).transform(toUpper).optional(),
});
