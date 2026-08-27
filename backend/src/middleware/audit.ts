/**
 * MIDDLEWARE — Audit Log
 *
 * Helper para registrar acciones en la tabla audit_log.
 * Se llama manualmente en los controllers/repositories donde se necesita trazabilidad.
 */
import { getDatabase } from '../db/connection.js';

export function registrarAudit(params: {
  usuario_id: string;
  accion: 'crear' | 'editar' | 'eliminar' | 'anular';
  entidad: string;
  entidad_id: string;
  datos_anteriores?: unknown;
  datos_nuevos?: unknown;
}): void {
  const db = getDatabase();
  db.prepare(
    `INSERT INTO audit_log (usuario_id, accion, entidad, entidad_id, datos_anteriores, datos_nuevos)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(
    params.usuario_id,
    params.accion,
    params.entidad,
    params.entidad_id,
    params.datos_anteriores ? JSON.stringify(params.datos_anteriores) : null,
    params.datos_nuevos ? JSON.stringify(params.datos_nuevos) : null,
  );
}
