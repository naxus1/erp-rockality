-- ============================================
-- Migración 004: Gastos operativos (modelo completo)
-- ============================================

-- Gerencias / Centros de costo
CREATE TABLE gerencias (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL UNIQUE
);

INSERT INTO gerencias (nombre) VALUES
  ('Deportiva'),
  ('Administrativa');

-- Tipos de gasto (clasificación contable)
CREATE TABLE tipos_gasto (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL UNIQUE
);

INSERT INTO tipos_gasto (nombre) VALUES
  ('Nómina'),
  ('Gastos generales'),
  ('Gastos fijos');

-- Categorías de gasto (detalle operativo)
CREATE TABLE categorias_gasto (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL UNIQUE,
  descripcion TEXT
);

INSERT INTO categorias_gasto (nombre, descripcion) VALUES
  ('Arriendo', 'Pago mensual del local'),
  ('Servicios públicos', 'Agua, luz, internet, gas'),
  ('Insumos', 'Productos de aseo, toallas, etc'),
  ('Mantenimiento', 'Reparación de equipos y local'),
  ('Marketing', 'Publicidad, redes sociales, volantes'),
  ('Nómina entrenadores', 'Pagos a entrenadores'),
  ('Nómina administrativos', 'Pagos a personal administrativo'),
  ('Otros', 'Gastos no clasificados');

-- Gastos (tabla principal)
CREATE TABLE gastos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tercero_nit TEXT NOT NULL,                       -- FK: a quién se le paga
  gerencia_id INTEGER NOT NULL,                    -- FK: área (deportiva/administrativa)
  tipo_gasto_id INTEGER NOT NULL,                  -- FK: nómina, general, fijo
  categoria_gasto_id INTEGER NOT NULL,             -- FK: arriendo, servicios, etc
  descripcion TEXT NOT NULL,                       -- detalle del gasto
  valor_base INTEGER NOT NULL,                     -- centavos COP (sin IVA)
  iva INTEGER NOT NULL DEFAULT 0,                  -- monto IVA centavos
  total INTEGER NOT NULL,                          -- base + iva
  periodo_mes INTEGER NOT NULL,                    -- mes al que pertenece (1-12)
  periodo_anio INTEGER NOT NULL,                   -- año al que pertenece
  fecha_pago TEXT NOT NULL DEFAULT (date('now')),  -- cuándo se pagó realmente
  metodo_pago_id INTEGER,                          -- FK: cómo se pagó
  referencia_pago TEXT,                            -- factura, recibo, etc
  estado TEXT NOT NULL DEFAULT 'registrado' CHECK (estado IN ('registrado', 'anulado')),
  recurrente INTEGER NOT NULL DEFAULT 0,           -- 1 = gasto fijo que se repite cada mes
  notas TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_by TEXT,
  FOREIGN KEY (tercero_nit) REFERENCES terceros(nit),
  FOREIGN KEY (gerencia_id) REFERENCES gerencias(id),
  FOREIGN KEY (tipo_gasto_id) REFERENCES tipos_gasto(id),
  FOREIGN KEY (categoria_gasto_id) REFERENCES categorias_gasto(id),
  FOREIGN KEY (metodo_pago_id) REFERENCES metodos_pago(id)
);

-- Índices para reportes
CREATE INDEX idx_gastos_fecha ON gastos(fecha_pago);
CREATE INDEX idx_gastos_periodo ON gastos(periodo_anio, periodo_mes);
CREATE INDEX idx_gastos_tercero ON gastos(tercero_nit);
CREATE INDEX idx_gastos_gerencia ON gastos(gerencia_id);
CREATE INDEX idx_gastos_tipo ON gastos(tipo_gasto_id);
CREATE INDEX idx_gastos_categoria ON gastos(categoria_gasto_id);
CREATE INDEX idx_gastos_estado ON gastos(estado);
