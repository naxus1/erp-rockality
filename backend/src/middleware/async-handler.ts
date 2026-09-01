/**
 * MIDDLEWARE — asyncHandler
 *
 * Envuelve un handler asíncrono de Express y reenvía cualquier promesa
 * rechazada a `next(err)`. Express 4 NO captura errores de funciones async por
 * sí solo, así que sin este wrapper un `await` que lanza dejaría la request
 * colgada. Con él, los errores caen en el error handler global de app.ts.
 */
import type { Request, Response, NextFunction, RequestHandler } from 'express';

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}
