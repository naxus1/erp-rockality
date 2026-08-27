-- ============================================
-- Migración 005: Usuarios del sistema y Auditoría
-- ============================================

-- Usuarios internos del sistema (admin, gerente, entrenador)
CREATE TABLE usuarios_sistema (
  id TEXT PRIMARY KEY,                             -- UUID o username (ej: "admin", "gerente")
  nombre TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  rol TEXT NOT NULL CHECK (rol IN ('admin', 'gerente', 'vendedor')),
  activo INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Datos iniciales (los 2 usuarios del gimnasio)
INSERT INTO usuarios_sistema (id, nombre, email, rol) VALUES
  ('admin', 'Administrador', 'admin@rockality.com', 'admin'),
  ('gerente', 'Gerente', 'gerente@rockality.com', 'gerente'),
  ('vendedor', 'Vendedor', 'vendedor@rockality.com', 'vendedor');

-- Auditoría de negocio (quién hizo qué y cuándo)
CREATE TABLE audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id TEXT NOT NULL,                        -- FK lógica a usuarios_sistema
  accion TEXT NOT NULL CHECK (accion IN ('crear', 'editar', 'eliminar', 'anular')),
  entidad TEXT NOT NULL,                           -- tabla afectada (venta, producto, cliente, etc)
  entidad_id TEXT NOT NULL,                        -- PK del registro (TEXT para soportar cédula, SKU, NIT)
  datos_anteriores TEXT,                           -- JSON snapshot antes del cambio
  datos_nuevos TEXT,                               -- JSON snapshot después del cambio
  ip_origen TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Índices
CREATE INDEX idx_audit_usuario ON audit_log(usuario_id);
CREATE INDEX idx_audit_entidad ON audit_log(entidad, entidad_id);
CREATE INDEX idx_audit_fecha ON audit_log(created_at);
CREATE INDEX idx_audit_accion ON audit_log(accion);
CREATE INDEX idx_usuarios_rol ON usuarios_sistema(rol);
