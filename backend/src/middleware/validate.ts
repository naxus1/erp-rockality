/**
 * MIDDLEWARE — Validación de request body con Zod
 *
 * Valida que el body del request cumpla con el schema definido.
 * Si no cumple, devuelve 400 con los errores detallados.
 */
import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

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
          details: error.errors.map((e) => ({
            campo: e.path.join('.'),
            mensaje: e.message,
          })),
        });
        return;
      }
      next(error);
    }
  };
}
