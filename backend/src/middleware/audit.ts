/**
 * MIDDLEWARE — Audit Log
 *
 * Helper para registrar acciones en la tabla audit_log.
 * Se llama manualmente en los controllers/repositories donde se necesita trazabilidad.
 */
import { query } from '../db/connection.js';

export async function registrarAudit(params: {
  usuario_id: string;
  accion: 'crear' | 'editar' | 'eliminar' | 'anular';
  entidad: string;
  entidad_id: string;
  datos_anteriores?: unknown;
  datos_nuevos?: unknown;
}): Promise<void> {
  await query(
    `INSERT INTO audit_log (usuario_id, accion, entidad, entidad_id, datos_anteriores, datos_nuevos)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      params.usuario_id,
      params.accion,
      params.entidad,
      params.entidad_id,
      params.datos_anteriores ? JSON.stringify(params.datos_anteriores) : null,
      params.datos_nuevos ? JSON.stringify(params.datos_nuevos) : null,
    ],
  );
}
