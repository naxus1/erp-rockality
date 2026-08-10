-- ============================================
-- Migración 005: Tabla de auditoría
-- ============================================
-- Registra quién hizo qué y cuándo (trazabilidad de negocio).
-- Ejemplos: quién anuló una venta, quién cambió un precio,
-- quién editó datos de un cliente.

CREATE TABLE audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id TEXT NOT NULL,                        -- ID del usuario que realizó la acción
  accion TEXT NOT NULL CHECK (accion IN ('crear', 'editar', 'eliminar', 'anular')),
  entidad TEXT NOT NULL,                           -- nombre de la tabla afectada (venta, producto, etc)
  entidad_id INTEGER NOT NULL,                     -- ID del registro afectado
  datos_anteriores TEXT,                           -- JSON con el estado anterior (null si es crear)
  datos_nuevos TEXT,                               -- JSON con el estado nuevo (null si es eliminar)
  ip_origen TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Índices para consultas de auditoría
CREATE INDEX idx_audit_usuario ON audit_log(usuario_id);
CREATE INDEX idx_audit_entidad ON audit_log(entidad, entidad_id);
CREATE INDEX idx_audit_fecha ON audit_log(created_at);
CREATE INDEX idx_audit_accion ON audit_log(accion);
