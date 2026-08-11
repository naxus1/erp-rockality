-- ============================================
-- Migración 003: Planes de entrenamiento y Suscripciones
-- ============================================

CREATE TABLE planes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  modalidad TEXT NOT NULL CHECK (modalidad IN ('presencial', 'virtual', 'mixto')),
  duracion_dias INTEGER NOT NULL,                  -- 30, 60, 90, etc.
  precio INTEGER NOT NULL,                         -- centavos COP
  aplica_iva INTEGER NOT NULL DEFAULT 0,
  porcentaje_iva INTEGER NOT NULL DEFAULT 19,
  descripcion TEXT,
  activo INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_by TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_by TEXT
);

CREATE TABLE suscripciones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cliente_cedula TEXT NOT NULL,
  plan_id INTEGER NOT NULL,
  venta_id INTEGER,
  fecha_inicio TEXT NOT NULL,
  fecha_fin TEXT NOT NULL,
  estado TEXT NOT NULL DEFAULT 'activa' CHECK (estado IN ('activa', 'vencida', 'cancelada')),
  monto_pagado INTEGER NOT NULL,                   -- centavos COP
  notas TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_by TEXT,
  FOREIGN KEY (cliente_cedula) REFERENCES clientes(cedula),
  FOREIGN KEY (plan_id) REFERENCES planes(id),
  FOREIGN KEY (venta_id) REFERENCES ventas(id)
);

CREATE INDEX idx_planes_activo ON planes(activo);
CREATE INDEX idx_planes_modalidad ON planes(modalidad);
CREATE INDEX idx_suscripciones_cliente ON suscripciones(cliente_cedula);
CREATE INDEX idx_suscripciones_estado ON suscripciones(estado);
CREATE INDEX idx_suscripciones_fecha_fin ON suscripciones(fecha_fin);
