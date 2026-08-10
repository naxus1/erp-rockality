-- ============================================
-- Migración 003: Planes de entrenamiento y Suscripciones
-- ============================================

-- Planes disponibles en el gimnasio
CREATE TABLE planes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,                            -- ej: "Plan Básico", "Plan Premium", "Plan Full"
  modalidad TEXT NOT NULL CHECK (modalidad IN ('presencial', 'virtual', 'mixto')),
  duracion_dias INTEGER NOT NULL,                  -- 30, 60, 90, 180, 365...
  precio INTEGER NOT NULL,                         -- en centavos COP
  aplica_iva INTEGER NOT NULL DEFAULT 0,           -- consultar con contador si aplica
  porcentaje_iva INTEGER NOT NULL DEFAULT 19,
  descripcion TEXT,
  activo INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Suscripciones activas de clientes
CREATE TABLE suscripciones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cliente_id INTEGER NOT NULL,
  plan_id INTEGER NOT NULL,
  venta_id INTEGER,                                -- FK a la venta que generó esta suscripción
  fecha_inicio TEXT NOT NULL,
  fecha_fin TEXT NOT NULL,                         -- calculada: inicio + duración del plan
  estado TEXT NOT NULL DEFAULT 'activa' CHECK (estado IN ('activa', 'vencida', 'cancelada')),
  monto_pagado INTEGER NOT NULL,                   -- en centavos COP
  notas TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (cliente_id) REFERENCES clientes(id),
  FOREIGN KEY (plan_id) REFERENCES planes(id),
  FOREIGN KEY (venta_id) REFERENCES ventas(id)
);

-- Índices para consultas frecuentes
CREATE INDEX idx_planes_activo ON planes(activo);
CREATE INDEX idx_planes_modalidad ON planes(modalidad);
CREATE INDEX idx_suscripciones_cliente ON suscripciones(cliente_id);
CREATE INDEX idx_suscripciones_estado ON suscripciones(estado);
CREATE INDEX idx_suscripciones_fecha_fin ON suscripciones(fecha_fin);
