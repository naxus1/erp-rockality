/**
 * MIDDLEWARE — Validación de request body con Zod
 *
 * Valida que el body del request cumpla con el schema definido.
 * Si no cumple, devuelve 400 con los errores detallados.
 */
import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

// Etiquetas legibles para los nombres técnicos de campos, para que los mensajes
// de validación digan "Cómo se enteró" en vez de "canal_captacion_id".
const ETIQUETAS_CAMPOS: Record<string, string> = {
  cedula: 'Cédula',
  nombre: 'Nombre',
  apellidos: 'Apellidos',
  telefono: 'Teléfono',
  email: 'Email',
  fecha_nacimiento: 'Fecha de nacimiento',
  direccion: 'Dirección',
  ciudad_id: 'Ciudad',
  sexo_id: 'Sexo',
  canal_captacion_id: 'Cómo se enteró',
  referido_por: 'Referido por (cliente)',
  referido_por_nombre: 'Referido por (nombre)',
  whatsapp: 'WhatsApp',
  nit: 'NIT / Cédula',
  tipo_tercero_id: 'Tipo de tercero',
  nombre_contacto: 'Contacto',
  observaciones: 'Observaciones',
  categoria_id: 'Categoría',
  unidad_medida_id: 'Unidad de medida',
  proveedor_nit: 'Proveedor',
  precio_venta: 'Precio de venta',
  precio_costo: 'Precio de costo',
  modalidad: 'Modalidad',
  duracion_dias: 'Duración (días)',
  precio: 'Precio',
  tercero_nit: 'Tercero',
  gerencia_id: 'Gerencia',
  tipo_gasto_id: 'Tipo de gasto',
  categoria_gasto_id: 'Categoría',
  descripcion: 'Descripción',
  valor_base: 'Valor base',
  periodo_mes: 'Periodo (mes)',
  periodo_anio: 'Periodo (año)',
  metodo_pago_id: 'Método de pago',
  referencia_pago: 'Referencia / Factura',
  factura_proveedor: 'Factura del proveedor',
  items: 'Productos',
  cliente_cedula: 'Cliente',
  plan_id: 'Plan',
  venta_id: 'Venta',
  monto: 'Monto',
  saldo_contado: 'Efectivo contado',
  saldo_inicial: 'Base inicial',
  motivo: 'Motivo',
  tipo: 'Tipo',
  notas: 'Notas',
};

/** Convierte una ruta de campo Zod (ej. "items.0.cantidad") a una etiqueta legible. */
function etiquetaLegible(path: string): string {
  // Toma el primer segmento no numérico relevante (para arrays anidados usa el último nombre).
  const partes = path.split('.').filter((p) => !/^\d+$/.test(p));
  const clave = partes[partes.length - 1] || path;
  return ETIQUETAS_CAMPOS[clave] || clave;
}

export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          success: false,
          error: 'Datos inválidos',
          details: error.errors.map((e) => {
            const campo = e.path.join('.');
            return {
              campo: etiquetaLegible(campo),
              mensaje: e.message,
            };
          }),
        });
        return;
      }
      next(error);
    }
  };
}
